import { z } from "zod";

export const embeddedCheckoutV3OutgoingEvents = {
    placeholder: z.object({
        placeholder: z.number(),
    }),
};
export type EmbeddedCheckoutV3OutgoingEventMap = typeof embeddedCheckoutV3OutgoingEvents;
