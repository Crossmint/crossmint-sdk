import { z } from "zod";

export const paymentMethodManagementIncomingEvents = {
    "ui:height.changed": z.object({
        height: z.number(),
    }),
    "payment-method:selected": z.any(),
    "order-intent:created": z.any(),
};
export type PaymentMethodManagementIncomingEventMap =
    typeof paymentMethodManagementIncomingEvents;
