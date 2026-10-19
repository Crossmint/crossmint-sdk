import { z } from "zod";

const cvcRecollectionErrorReasonSchema = z.enum([
    "widget-unavailable",
    "invalid-configuration",
    "invalid-credentials",
    "provider-error",
    // The CVC was submitted but Crossmint could not confirm it; retriable.
    "verification-refused",
    "unknown",
]);

// What a `cvc:submit` resolves to. `invalid` and `failed` keep the form alive; `complete` and
// `refused` end it; `unavailable` means the form was not ready to confirm yet. Must match the
// cvc-recollection-ui copy in crossbit-main.
const cvcRecollectionSubmitResultSchema = z.union([
    z.discriminatedUnion("status", [
        z.object({ status: z.literal("complete") }),
        // The CVC is empty or incomplete; the frame shows the field error too.
        z.object({ status: z.literal("invalid"), message: z.string() }),
        // The vault update or the verify failed; the buyer or the host can confirm again.
        z.object({ status: z.literal("failed"), message: z.string() }),
        // Terminal: the flow is dead, the same error the frame reported through cvc:error.
        z.object({
            status: z.literal("refused"),
            reason: cvcRecollectionErrorReasonSchema,
            message: z.string(),
        }),
        z.object({ status: z.literal("unavailable"), message: z.string() }),
    ]),
    // A future iframe status still resolves instead of hanging the host until the submit timeout.
    z
        .object({ status: z.string(), message: z.string().optional() })
        .passthrough()
        .transform((result) => ({
            status: "failed" as const,
            message:
                result.message ?? "The CVC recollection component returned an unexpected result. Please try again.",
        })),
]);

export const cvcRecollectionIncomingEvents = {
    "ui:height.changed": z.object({
        height: z.number(),
    }),
    // Emitted only after Basis Theory accepted the new CVC and Crossmint recorded the
    // refresh. Carries nothing: no CVC, no token id.
    "cvc:complete": z.object({}),
    "cvc:error": z.object({
        retriable: z.boolean(),
        reason: cvcRecollectionErrorReasonSchema,
        message: z.string(),
    }),
    // The answer to a host's `cvc:submit`, correlated by requestId. The lifecycle events above
    // fire independently of it: a host that never submits never sees this event.
    "cvc:result": z.object({
        requestId: z.string().min(1),
        result: cvcRecollectionSubmitResultSchema,
    }),
};
export type CvcRecollectionIncomingEventMap = typeof cvcRecollectionIncomingEvents;
