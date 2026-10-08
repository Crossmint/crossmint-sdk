import type { OrderIntent, OrderIntentMerchant, OrderIntentRail } from "@/types/payment-method-management/OrderIntents";
import { ApiClientError, type CrossmintApiClient } from "@crossmint/common-sdk-base";
import { z } from "zod";

// ---- Order-intent registration (GET/PUT /api/unstable/payment-methods/{id}/order-intent-registration)

// A rail in `error` should carry `error.code`; when the server omits it, the rail is kept with
// an `unknown` code rather than dropped, so a failed registration never looks like a missing one.
const errorRailStateSchema = z
    .object({ status: z.literal("error"), error: z.object({ code: z.string() }).nullish() })
    .transform(({ error }) => ({ status: "error" as const, error: error ?? { code: "unknown" } }));

const registrationRailStateSchema = z.union([
    z.object({ status: z.enum(["enabled", "pending"]) }),
    errorRailStateSchema,
]);

const registrationRailSchema = z.intersection(
    registrationRailStateSchema,
    z.discriminatedUnion("rail", [
        z.object({ rail: z.literal("agentic-token"), provider: z.enum(["vic", "agentpay"]) }),
        z.object({ rail: z.literal("spt"), provider: z.literal("stripe") }),
    ])
);
export type OrderIntentRegistrationRail = z.infer<typeof registrationRailSchema>;

const registrationSchema = z.object({
    paymentMethodId: z.string(),
    rails: z.array(z.unknown()),
});

export interface OrderIntentRegistration {
    paymentMethodId: string;
    rails: OrderIntentRegistrationRail[];
}

export interface OrderIntentRegistrationRequest {
    email?: string;
    /** ISO 3166-1 alpha-2, upper case. */
    countryCode?: string;
    languageCode?: string;
}

// ---- Order intents (POST/GET /api/unstable/order-intents)

const railStateSchema = z.union([
    z.object({ status: z.enum(["active", "pending_verification"]) }),
    errorRailStateSchema,
]);

const agenticTokenRailSchema = z.intersection(
    railStateSchema,
    z.object({
        rail: z.literal("agentic-token"),
        provider: z.enum(["vic", "agentpay"]),
        credentialFormats: z.array(z.enum(["card", "network-token"])),
    })
);

const encryptedCardRailSchema = z.intersection(
    z.union([z.object({ status: z.enum(["active", "pending_cvc_recollection"]) }), errorRailStateSchema]),
    z.object({ rail: z.literal("encrypted-card"), credentialFormats: z.array(z.literal("card")) })
);

const sptRailSchema = z.intersection(
    railStateSchema,
    z.object({
        rail: z.literal("spt"),
        provider: z.literal("stripe"),
        credentialFormats: z.array(z.literal("identifier")),
    })
);

// One schema for every rail the SDK knows, so a single pass keeps the server's order.
const orderIntentRailSchema = z.union([agenticTokenRailSchema, encryptedCardRailSchema, sptRailSchema]);

const merchantSchema = z.object({
    name: z.string(),
    url: z.string(),
    countryCode: z.string(),
    categoryCode: z.string().optional(),
    acquirerBin: z.string().optional(),
});

const orderIntentSchema = z.object({
    orderIntentId: z.string(),
    paymentMethodId: z.string(),
    status: z.enum(["active", "cancelled", "expired"]),
    amount: z.object({
        total: z.string(),
        spent: z.string(),
        reserved: z.string(),
        available: z.string(),
        currency: z.string(),
    }),
    merchant: merchantSchema.optional(),
    description: z.string(),
    rails: z.array(z.unknown()),
    verificationConfig: z
        .object({
            environment: z.enum(["production", "test"]),
            publicApiKey: z.string(),
            allowanceId: z.string(),
        })
        .optional(),
    expiresAt: z.string(),
});

export interface CreateOrderIntentRequest {
    paymentMethodId: string;
    /** `value` is a decimal string with up to 4 places, greater than 0; `currency` is a 3-letter code. */
    amount: { value: string; currency: string };
    merchant?: OrderIntentMerchant;
    description: string;
    /** ISO 8601 datetime in the future. */
    expiresAt: string;
}

/**
 * The one error class every call of `createOrderIntentsApi` throws: JSON 4xx bodies, transport
 * and 5xx failures from the shared client, and 2xx bodies that are empty or not the expected shape.
 * @experimental Wraps `/api/unstable` routes; the signature may change in a minor release.
 */
export class OrderIntentsApiError extends Error {
    constructor(
        message: string,
        public readonly status: number | undefined,
        public readonly path: string
    ) {
        super(message);
        this.name = "OrderIntentsApiError";
    }
}

const railIdentitySchema = z.object({
    rail: z.string().optional(),
    provider: z.string().optional(),
    status: z.string().optional(),
});

// A rail the SDK does not know (a new rail, provider or status) is dropped rather than failing
// the whole response: the rail policy can only pick rails it understands anyway. Known rails
// keep the position the server gave them. Each drop is logged (identity only, never the
// whole payload) so "no rails" and "rails we could not read" stay distinguishable.
function parseKnownRails<T>(schema: z.ZodType<T, z.ZodTypeDef, unknown>, rails: unknown[], path: string): T[] {
    const known: T[] = [];
    for (const rail of rails) {
        const result = schema.safeParse(rail);
        if (result.success) {
            known.push(result.data);
            continue;
        }
        const identity = railIdentitySchema.safeParse(rail);
        console.warn(`[OrderIntentsApi] dropped a rail the SDK does not understand from ${path}`, {
            rail: identity.success ? identity.data.rail : undefined,
            provider: identity.success ? identity.data.provider : undefined,
            status: identity.success ? identity.data.status : undefined,
        });
    }
    return known;
}

function toOrderIntent(parsed: z.infer<typeof orderIntentSchema>, path: string): OrderIntent {
    const { rails, verificationConfig, ...rest } = parsed;
    const knownRails = parseKnownRails<OrderIntentRail>(orderIntentRailSchema, rails, path);
    if (verificationConfig != null) {
        return { ...rest, rails: knownRails, verificationConfig };
    }
    return { ...rest, rails: knownRails };
}

// `message` is a string, or a string array in the NestJS validation format.
const errorBodySchema = z.object({ message: z.union([z.string(), z.array(z.string())]) });

async function readErrorMessage(response: Response, fallback: string): Promise<string> {
    try {
        const body = errorBodySchema.safeParse(await response.json());
        if (body.success) {
            return Array.isArray(body.data.message) ? body.data.message.join("; ") : body.data.message;
        }
    } catch {
        // Not a JSON body; use the fallback.
    }
    return fallback;
}

export type OrderIntentsApiProps = {
    apiClient: CrossmintApiClient;
};

/**
 * Buyer-JWT authenticated calls behind `CrossmintAgentCardAuthorization`. Every request carries
 * `x-api-key` (client key) and `Authorization: Bearer <jwt>` through the shared API client, and
 * every failure surfaces as `OrderIntentsApiError`.
 * @experimental Wraps `/api/unstable` routes; the signature may change in a minor release.
 */
export function createOrderIntentsApi({ apiClient }: OrderIntentsApiProps) {
    // The shared client throws ApiClientError for 5xx and non-JSON 4xx; callers get one class.
    async function send(path: string, request: () => Promise<Response>): Promise<Response> {
        try {
            return await request();
        } catch (error) {
            if (error instanceof ApiClientError) {
                throw new OrderIntentsApiError(error.message, error.status, path);
            }
            throw error;
        }
    }

    async function parseJsonResponse<T>(response: Response, path: string, schema: z.ZodType<T>): Promise<T> {
        if (!response.ok) {
            const message = await readErrorMessage(response, `${response.status} ${response.statusText}`);
            throw new OrderIntentsApiError(message, response.status, path);
        }
        // The shared client lets any 2xx through, so an empty or non-JSON body surfaces here.
        let body: unknown;
        try {
            body = await response.json();
        } catch {
            throw new OrderIntentsApiError(`Unexpected non-JSON response from ${path}`, response.status, path);
        }
        const result = schema.safeParse(body);
        if (!result.success) {
            throw new OrderIntentsApiError(`Unexpected response shape from ${path}`, response.status, path);
        }
        return result.data;
    }

    function registrationPath(paymentMethodId: string) {
        return `/api/unstable/payment-methods/${encodeURIComponent(paymentMethodId)}/order-intent-registration`;
    }

    function toRegistration(parsed: z.infer<typeof registrationSchema>, path: string): OrderIntentRegistration {
        return {
            paymentMethodId: parsed.paymentMethodId,
            rails: parseKnownRails<OrderIntentRegistrationRail>(registrationRailSchema, parsed.rails, path),
        };
    }

    /** Scope `payment-methods.read`. Resolves to `null` when the card has no registration yet. */
    async function getRegistration(paymentMethodId: string): Promise<OrderIntentRegistration | null> {
        const path = registrationPath(paymentMethodId);
        let response: Response;
        try {
            response = await send(path, () => apiClient.get(path, {}));
        } catch (error) {
            // A non-JSON 404 (for example from a proxy) surfaces as an error before we see the response.
            if (error instanceof OrderIntentsApiError && error.status === 404) {
                return null;
            }
            throw error;
        }
        if (response.status === 404) {
            return null;
        }
        return toRegistration(await parseJsonResponse(response, path, registrationSchema), path);
    }

    /** Scope `payment-methods.create`. Idempotent; never prompts the buyer. */
    async function register(
        paymentMethodId: string,
        request: OrderIntentRegistrationRequest = {}
    ): Promise<OrderIntentRegistration> {
        const path = registrationPath(paymentMethodId);
        const response = await send(path, () =>
            apiClient.put(path, { headers: { "Content-Type": "application/json" }, body: JSON.stringify(request) })
        );
        return toRegistration(await parseJsonResponse(response, path, registrationSchema), path);
    }

    /** Scope `order-intents.create`. */
    async function createOrderIntent(request: CreateOrderIntentRequest): Promise<OrderIntent> {
        const path = "/api/unstable/order-intents";
        const response = await send(path, () =>
            apiClient.post(path, { headers: { "Content-Type": "application/json" }, body: JSON.stringify(request) })
        );
        return toOrderIntent(await parseJsonResponse(response, path, orderIntentSchema), path);
    }

    /** Scope `order-intents.read`. */
    async function getOrderIntent(orderIntentId: string): Promise<OrderIntent> {
        const path = `/api/unstable/order-intents/${encodeURIComponent(orderIntentId)}`;
        const response = await send(path, () => apiClient.get(path, {}));
        return toOrderIntent(await parseJsonResponse(response, path, orderIntentSchema), path);
    }

    return { getRegistration, register, createOrderIntent, getOrderIntent };
}

export type OrderIntentsApi = ReturnType<typeof createOrderIntentsApi>;
