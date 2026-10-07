import { z } from "zod";

export const protectedInputOutgoingEvents = {
    "protected-input:collect": z.object({
        requestId: z.string().min(1),
        jwt: z.string().min(1),
        apiKey: z.string().min(1),
        expiresAt: z.string().datetime({ offset: true }).optional(),
    }),
    "protected-input:reset": z.object({}),
    "protected-input:state": z.object({ disabled: z.boolean(), invalid: z.boolean() }),
};
export type ProtectedInputOutgoingEventMap = typeof protectedInputOutgoingEvents;
