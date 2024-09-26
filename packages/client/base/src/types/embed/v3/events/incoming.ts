import { z } from "zod";

export const embeddedCheckoutV3IncomingEvents = {
    "ui:height.changed": z.object({
        height: z.number(),
    }),
};
export type EmbeddedCheckoutV3IncomingEventMap = typeof embeddedCheckoutV3IncomingEvents;
