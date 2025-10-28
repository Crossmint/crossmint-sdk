import { z } from "zod";

export const paymentMethodManagementIncomingEvents = {
    "ui:height.changed": z.object({
        height: z.number(),
    }),
};
export type PaymentMethodManagementIncomingEventMap = typeof paymentMethodManagementIncomingEvents;
