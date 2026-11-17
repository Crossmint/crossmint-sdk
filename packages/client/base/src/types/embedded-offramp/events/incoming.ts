import { z } from "zod";

export const OFFRAMP_STATUSES = [
    "loading",
    "entering-amount",
    "selecting-bank",
    "adding-bank",
    "verifying-identity",
    "identity-in-review",
    "reviewing",
    "awaiting-signature",
    "confirming-deposit",
    "completed",
    "payout-completed",
    "payout-failed",
    "failed",
] as const;

export const OFFRAMP_ERROR_REASONS = [
    "invalid-credentials",
    "invalid-configuration",
    "session-spent",
    "identity-verification-required",
    "identity-verification-failed",
    "wallet-ownership-required",
    "bank-not-supported",
    "bank-not-verified",
    "bank-holder-mismatch",
    "amount-too-low",
    "amount-too-high",
    "exact-payout-unsupported",
    "insufficient-funds",
    "wallet-rejected",
    "payout-failed",
    "provider-error",
    "unknown",
] as const;

export const embeddedOfframpIncomingEvents = {
    "ui:height.changed": z.object({ height: z.number() }),
    "offramp:ready": z.object({}),
    "offramp:status": z.object({ status: z.enum(OFFRAMP_STATUSES), orderId: z.string().optional() }),
    "offramp:completed": z.object({ orderId: z.string(), txId: z.string() }),
    "offramp:cancelled": z.object({}),
    "offramp:error": z.object({ reason: z.enum(OFFRAMP_ERROR_REASONS), retriable: z.boolean(), message: z.string() }),
    "crypto:send-transaction": z.object({
        serializedTransaction: z.string(),
        chain: z.string(),
        payerAddress: z.string(),
    }),
};
export type EmbeddedOfframpIncomingEventMap = typeof embeddedOfframpIncomingEvents;
