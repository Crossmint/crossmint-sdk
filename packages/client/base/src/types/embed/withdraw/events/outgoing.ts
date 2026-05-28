import { z } from "zod";

export const embeddedWithdrawOutgoingEvents = {
    "crypto:send-transaction:success": z.object({
        txId: z.string(),
    }),
    "crypto:send-transaction:failed": z.object({
        error: z.string(),
    }),
};
export type EmbeddedWithdrawOutgoingEventMap = typeof embeddedWithdrawOutgoingEvents;
