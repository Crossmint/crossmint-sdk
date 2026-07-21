import { z } from "zod";

import { embeddedOfframpStatusSchema } from "../EmbeddedOfframpStatus";

export const embeddedCheckoutV3IncomingEvents = {
    "ui:height.changed": z.object({
        height: z.number(),
    }),
    // Offramp cash-out lifecycle status (O1-8). Emitted by the iframe on each offramp phase change.
    "offramp:status": z.object({
        status: embeddedOfframpStatusSchema,
        orderId: z.string().optional(),
    }),
    "crypto:load": z.object({}),
    "crypto:connect-wallet.show": z.object({
        show: z.boolean(),
    }),
    "crypto:send-transaction": z.object({
        chain: z.string(),
        serializedTransaction: z.string(),
    }),
    "crypto:sign-message": z.object({
        message: z.string(),
    }),
    "order:updated": z.object({
        order: z.any().optional(),
        orderClientSecret: z.string().optional(),
    }),
    "order:creation-failed": z.object({
        errorMessage: z.string(),
    }),
};
export type EmbeddedCheckoutV3IncomingEventMap = typeof embeddedCheckoutV3IncomingEvents;
