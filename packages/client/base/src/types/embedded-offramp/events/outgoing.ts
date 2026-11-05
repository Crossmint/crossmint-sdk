import { z } from "zod";

export const embeddedOfframpOutgoingEvents = {
    "crypto:send-transaction:success": z.object({ txId: z.string() }),
    "crypto:send-transaction:failed": z.object({ error: z.string(), rejected: z.boolean() }),
};
export type EmbeddedOfframpOutgoingEventMap = typeof embeddedOfframpOutgoingEvents;
