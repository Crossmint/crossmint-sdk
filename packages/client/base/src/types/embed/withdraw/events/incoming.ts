import { z } from "zod";

export const embeddedWithdrawIncomingEvents = {
    "ui:height.changed": z.object({
        height: z.number(),
    }),
    "crypto:send-transaction": z.object({
        chain: z.string(),
        serializedTransaction: z.string(),
    }),
    "order:updated": z.object({
        order: z.any().optional(),
        orderClientSecret: z.string().optional(),
    }),
    "order:creation-failed": z.object({
        errorMessage: z.string(),
    }),
    "withdraw:quote-expired": z.object({}),
};
export type EmbeddedWithdrawIncomingEventMap = typeof embeddedWithdrawIncomingEvents;
