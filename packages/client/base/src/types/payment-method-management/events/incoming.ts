import { z } from "zod";

const cardTokenSelectedSchema = z.object({
    type: z.literal("card-token"),
    cardToken: z.object({
        id: z.string(),
        billing: z
            .object({
                name: z.string().optional(),
            })
            .optional(),
    }),
});

const cardPaymentMethodSelectedSchema = z.object({
    type: z.literal("card"),
    paymentMethod: z
        .object({
            type: z.literal("card"),
            paymentMethodId: z.string(),
        })
        .passthrough(),
});

export const paymentMethodManagementIncomingEvents = {
    "ui:height.changed": z.object({
        height: z.number(),
    }),
    "payment-method:selected": z.discriminatedUnion("type", [cardPaymentMethodSelectedSchema, cardTokenSelectedSchema]),
};
export type PaymentMethodManagementIncomingEventMap = typeof paymentMethodManagementIncomingEvents;
