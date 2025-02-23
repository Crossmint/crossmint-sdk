import { z } from "zod";

export const embeddedCheckoutV3OutgoingEvents = {
    "crypto:connect-wallet.failed": z.object({
        error: z.string(),
    }),
    "crypto:connect-wallet.success": z.object({
        address: z.string(),
        chain: z.string(),
        walletProviderKey: z.string().optional(),
    }),
    "crypto:send-transaction:success": z.object({
        txId: z.string(),
    }),
    "crypto:send-transaction:failed": z.object({
        error: z.string(),
    }),
};
export type EmbeddedCheckoutV3OutgoingEventMap = typeof embeddedCheckoutV3OutgoingEvents;
