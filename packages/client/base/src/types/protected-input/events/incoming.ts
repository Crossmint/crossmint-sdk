import { z } from "zod";

/** Codes the hosted page posts in `protected-input:error`. */
export const PROTECTED_INPUT_PAGE_ERROR_CODES = [
    "protected_input_failed",
    "provider_unavailable",
    "invalid_params",
] as const;
/** Codes the SDK component reports itself, without a round trip to the hosted page. */
export const PROTECTED_INPUT_SDK_ERROR_CODES = ["missing_jwt", "load_timeout"] as const;
export const PROTECTED_INPUT_ERROR_CODES = [
    ...PROTECTED_INPUT_PAGE_ERROR_CODES,
    ...PROTECTED_INPUT_SDK_ERROR_CODES,
] as const;
export type ProtectedInputKnownErrorCode = (typeof PROTECTED_INPUT_ERROR_CODES)[number];
/**
 * The known codes, with room for codes the hosted page adds later. Switch on the known ones
 * and keep a default branch.
 */
export type ProtectedInputErrorCode = ProtectedInputKnownErrorCode | (string & {});

const protectedInputErrorCodeSchema: z.ZodType<ProtectedInputErrorCode> = z.union([
    z.enum(PROTECTED_INPUT_PAGE_ERROR_CODES),
    z.string(),
]);

// The hosted page posts exactly one terminal event per mount (`created` or `error`). It never
// posts the password, the vault token id, or anything else.
export const protectedInputIncomingEvents = {
    // The iframe starts at 0px; the page measures itself and posts its height on every change.
    "ui:height.changed": z.object({
        height: z.number().nonnegative(),
    }),
    "protected-input:created": z.object({
        protectedInputId: z.string(),
        purpose: z.literal("password"),
        merchant: z.object({ domain: z.string() }),
        expiresAt: z.string(),
    }),
    "protected-input:error": z.object({
        code: protectedInputErrorCodeSchema,
        message: z.string(),
    }),
};
export type ProtectedInputIncomingEventMap = typeof protectedInputIncomingEvents;
