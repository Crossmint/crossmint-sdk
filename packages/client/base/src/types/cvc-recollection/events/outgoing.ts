import { z } from "zod";

export const cvcRecollectionOutgoingEvents = {
    // The host's own submit button: the iframe runs the same confirm its own button would
    // and answers with `cvc:result` carrying the same requestId.
    "cvc:submit": z.object({
        requestId: z.string().min(1),
    }),
};
export type CvcRecollectionOutgoingEventMap = typeof cvcRecollectionOutgoingEvents;
