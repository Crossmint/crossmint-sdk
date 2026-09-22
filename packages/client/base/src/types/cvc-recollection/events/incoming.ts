import { z } from "zod";

export const cvcRecollectionIncomingEvents = {
    "ui:height.changed": z.object({
        height: z.number(),
    }),
    // Emitted only after Basis Theory accepted the new CVC and Crossmint recorded the
    // refresh. Carries nothing: no CVC, no token id.
    "cvc:complete": z.object({}),
    "cvc:error": z.object({
        retriable: z.boolean(),
        reason: z.enum([
            "widget-unavailable",
            "invalid-configuration",
            "invalid-credentials",
            "provider-error",
            // The vault accepted the CVC but Crossmint could not verify the write; retriable.
            "verification-refused",
            "unknown",
        ]),
        message: z.string(),
    }),
};
export type CvcRecollectionIncomingEventMap = typeof cvcRecollectionIncomingEvents;
