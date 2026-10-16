import type { CrossmintApiClient } from "@crossmint/common-sdk-base";
import { z } from "zod";

import { UnstableApiError, expectNoContent, parseJsonResponse, sendUnstableRequest } from "../api/unstableApi";

export const PROTECTED_INPUT_STATUSES = ["active", "revoked", "expired"] as const;
export type ProtectedInputStatus = (typeof PROTECTED_INPUT_STATUSES)[number];

// Metadata only: the routes never return the secret or the vault token id.
export const protectedInputSchema = z.object({
    protectedInputId: z.string(),
    purpose: z.literal("password"),
    status: z.enum(PROTECTED_INPUT_STATUSES),
    merchant: z.object({ domain: z.string() }),
    expiresAt: z.string(),
    createdAt: z.string(),
});
/** A protected input as the buyer-facing routes describe it. */
export type ProtectedInput = z.infer<typeof protectedInputSchema>;

/**
 * The one error class every call of `createProtectedInputsApi` throws.
 * @experimental Wraps `/api/unstable` routes; the signature may change in a minor release.
 */
export class ProtectedInputsApiError extends UnstableApiError {
    constructor(message: string, status: number | undefined, path: string) {
        super(message, status, path);
        this.name = "ProtectedInputsApiError";
    }
}

const toProtectedInputsApiError = (message: string, status: number | undefined, path: string) =>
    new ProtectedInputsApiError(message, status, path);

export type ProtectedInputsApiProps = {
    apiClient: CrossmintApiClient;
};

/**
 * Buyer-JWT authenticated calls on the buyer's protected inputs: list and read their metadata,
 * and revoke one so Universal Checkout can no longer use it. Creation stays with the hosted
 * page behind `CrossmintProtectedInput`. Every request carries `x-api-key` and
 * `Authorization: Bearer <jwt>` through the shared API client, and every failure surfaces as
 * `ProtectedInputsApiError`.
 * @experimental Wraps `/api/unstable` routes; the signature may change in a minor release.
 */
export function createProtectedInputsApi({ apiClient }: ProtectedInputsApiProps) {
    const send = (path: string, request: () => Promise<Response>) =>
        sendUnstableRequest(path, request, toProtectedInputsApiError);

    function inputPath(protectedInputId: string) {
        return `/api/unstable/protected-inputs/${encodeURIComponent(protectedInputId)}`;
    }

    /**
     * Scope `protected-inputs.read`. An entry the SDK cannot read (for example a purpose added
     * later) is dropped with a warning that names only its id and purpose.
     */
    async function list(): Promise<ProtectedInput[]> {
        const path = "/api/unstable/protected-inputs";
        const response = await send(path, () => apiClient.get(path, {}));
        const entries = await parseJsonResponse(response, path, z.array(z.unknown()), toProtectedInputsApiError);
        const known: ProtectedInput[] = [];
        for (const entry of entries) {
            const result = protectedInputSchema.safeParse(entry);
            if (result.success) {
                known.push(result.data);
                continue;
            }
            const identity = z
                .object({ protectedInputId: z.string().optional(), purpose: z.string().optional() })
                .safeParse(entry);
            console.warn(`[ProtectedInputsApi] dropped an entry the SDK does not understand from ${path}`, {
                protectedInputId: identity.success ? identity.data.protectedInputId : undefined,
                purpose: identity.success ? identity.data.purpose : undefined,
            });
        }
        return known;
    }

    /** Scope `protected-inputs.read`. */
    async function get(protectedInputId: string): Promise<ProtectedInput> {
        const path = inputPath(protectedInputId);
        const response = await send(path, () => apiClient.get(path, {}));
        return await parseJsonResponse(response, path, protectedInputSchema, toProtectedInputsApiError);
    }

    /**
     * Scope `protected-inputs.revoke`. The server deletes the underlying secret and the input
     * can no longer be released to Universal Checkout; the route answers 204.
     */
    async function revoke(protectedInputId: string): Promise<void> {
        const path = inputPath(protectedInputId);
        const response = await send(path, () => apiClient.delete(path, {}));
        await expectNoContent(response, path, toProtectedInputsApiError);
    }

    return { list, get, revoke };
}

export type ProtectedInputsApi = ReturnType<typeof createProtectedInputsApi>;
