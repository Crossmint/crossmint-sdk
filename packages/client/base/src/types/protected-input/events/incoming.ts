import { z } from "zod";

export const protectedInputIncomingEvents = {
    "ui:height.changed": z.object({ height: z.number().nonnegative() }),
    "protected-input:result": z.object({
        requestId: z.string().min(1),
        result: z.discriminatedUnion("status", [
            z.object({
                status: z.literal("collected"),
                input: z.object({ protectedInputId: z.string().min(1) }),
            }),
            z.object({ status: z.literal("invalid"), code: z.string(), message: z.string() }),
            z.object({ status: z.literal("unavailable"), code: z.string(), message: z.string() }),
            z.object({ status: z.literal("superseded"), message: z.string() }),
        ]),
    }),
};
export type ProtectedInputIncomingEventMap = typeof protectedInputIncomingEvents;
