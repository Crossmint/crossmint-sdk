import { z } from "zod";

// `paymentMethod` is the same shape `payment-method:selected` carries (CrossmintPaymentMethod);
// only the fields consumers narrow on are enforced, extra fields pass through.
const paymentMethodSchema = z.object({ type: z.string(), paymentMethodId: z.string() }).passthrough();

const paymentMethodSubmitResultSchema = z.union([
    z.discriminatedUnion("status", [
        z.object({ status: z.literal("selected"), paymentMethod: paymentMethodSchema }),
        z.object({ status: z.literal("saved"), paymentMethod: paymentMethodSchema }),
        z.object({ status: z.literal("invalid"), message: z.string() }),
        z.object({ status: z.literal("failed"), message: z.string() }),
        z.object({ status: z.literal("unavailable"), message: z.string() }),
    ]),
    // A future iframe status still resolves instead of hanging the host until the submit timeout.
    z
        .object({ status: z.string(), message: z.string().optional() })
        .passthrough()
        .transform((result) => ({
            status: "failed" as const,
            message: result.message ?? "The payment method component returned an unexpected result. Please try again.",
        })),
]);

export const paymentMethodManagementIncomingEvents = {
    "ui:height.changed": z.object({
        height: z.number(),
    }),
    "payment-method:selected": z.any(),
    "payment-method:result": z.object({
        requestId: z.string().min(1),
        result: paymentMethodSubmitResultSchema,
    }),
};
export type PaymentMethodManagementIncomingEventMap = typeof paymentMethodManagementIncomingEvents;
