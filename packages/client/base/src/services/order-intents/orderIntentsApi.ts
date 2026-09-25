import type { OrderIntent, OrderIntentMerchant, OrderIntentRail } from "@/types/payment-method-management/OrderIntents";
import type { CrossmintApiClient } from "@crossmint/common-sdk-base";
import { z } from "zod";

import { UnstableApiError, expectNoContent, parseJsonResponse, sendUnstableRequest } from "../api/unstableApi";

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

// ---- Order intents (POST/GET/DELETE /api/unstable/order-intents)

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
    /** Omit for Agent Checkouts: the checkout binds the credential to its merchant when it requests it. */
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
export class OrderIntentsApiError extends UnstableApiError {
    constructor(message: string, status: number | undefined, path: string) {
        super(message, status, path);
        this.name = "OrderIntentsApiError";
    }
}

const toOrderIntentsApiError = (message: string, status: number | undefined, path: string) =>
    new OrderIntentsApiError(message, status, path);

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
    const send = (path: string, request: () => Promise<Response>) =>
        sendUnstableRequest(path, request, toOrderIntentsApiError);
    const parse = <T>(response: Response, path: string, schema: z.ZodType<T, z.ZodTypeDef, unknown>) =>
        parseJsonResponse(response, path, schema, toOrderIntentsApiError);
    const jsonHeaders = { "Content-Type": "application/json" };

    function registrationPath(paymentMethodId: string) {
        return `/api/unstable/payment-methods/${encodeURIComponent(paymentMethodId)}/order-intent-registration`;
    }

    function orderIntentPath(orderIntentId: string) {
        return `/api/unstable/order-intents/${encodeURIComponent(orderIntentId)}`;
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
        return toRegistration(await parse(response, path, registrationSchema), path);
    }

    /** Scope `payment-methods.create`. Idempotent; never prompts the buyer. */
    async function register(
        paymentMethodId: string,
        request: OrderIntentRegistrationRequest = {}
    ): Promise<OrderIntentRegistration> {
        const path = registrationPath(paymentMethodId);
        const response = await send(path, () =>
            apiClient.put(path, { headers: jsonHeaders, body: JSON.stringify(request) })
        );
        return toRegistration(await parse(response, path, registrationSchema), path);
    }

    /** Scope `order-intents.create`. */
    async function createOrderIntent(request: CreateOrderIntentRequest): Promise<OrderIntent> {
        const path = "/api/unstable/order-intents";
        const response = await send(path, () =>
            apiClient.post(path, { headers: jsonHeaders, body: JSON.stringify(request) })
        );
        return toOrderIntent(await parse(response, path, orderIntentSchema), path);
    }

    /** Scope `order-intents.read`. */
    async function getOrderIntent(orderIntentId: string): Promise<OrderIntent> {
        const path = orderIntentPath(orderIntentId);
        const response = await send(path, () => apiClient.get(path, {}));
        return toOrderIntent(await parse(response, path, orderIntentSchema), path);
    }

    /**
     * Scope `order-intents.revoke`. Cancels an active order intent so Universal Checkout can no
     * longer draw a credential from it; the route answers 204.
     */
    async function cancelOrderIntent(orderIntentId: string): Promise<void> {
        const path = orderIntentPath(orderIntentId);
        const response = await send(path, () => apiClient.delete(path, {}));
        await expectNoContent(response, path, toOrderIntentsApiError);
    }

    return { getRegistration, register, createOrderIntent, getOrderIntent, cancelOrderIntent };
}

export type OrderIntentsApi = ReturnType<typeof createOrderIntentsApi>;
