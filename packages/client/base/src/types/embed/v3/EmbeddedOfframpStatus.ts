import { z } from "zod";

// Offramp (cash-out) lifecycle status the embedded checkout iframe reports for offramp orders (O1-8).
// Mirrors the iframe's offramp view-state so integrators can drive UI around the cash-out flow
// without polling the order. The public vocabulary is formalized/narrowed further in O3-5.
export const embeddedOfframpStatusSchema = z.enum([
    "refreshing-quote",
    "preparing-deposit",
    "awaiting-signature",
    "confirming-deposit",
    "processing-payout",
    "completed",
    "payout-failed",
    "refunded",
    "session-expired",
]);
export type EmbeddedOfframpStatus = z.infer<typeof embeddedOfframpStatusSchema>;

export type EmbeddedOfframpStatusEvent = {
    status: EmbeddedOfframpStatus;
    orderId?: string;
};
