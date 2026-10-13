import { z } from "zod";

// `paymentMethod` is the same shape `payment-method:selected` carries (CrossmintPaymentMethod);
// both stay unvalidated here, as `payment-method:selected` always has been.
const paymentMethodSubmitResultSchema = z.discriminatedUnion("status", [
    z.object({ status: z.literal("selected"), paymentMethod: z.any() }),
    z.object({ status: z.literal("saved"), paymentMethod: z.any() }),
    z.object({ status: z.literal("invalid"), message: z.string() }),
    z.object({ status: z.literal("failed"), message: z.string() }),
    z.object({ status: z.literal("unavailable"), message: z.string() }),
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
