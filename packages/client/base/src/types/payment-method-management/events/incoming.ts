import { z } from "zod";

export const paymentMethodManagementIncomingEvents = {
    "ui:height.changed": z.object({
        height: z.number(),
    }),
    "payment-method:selected": z.any(),
    "agentic-enrollment:created": z.object({
        agenticEnrollment: z.object({
            enrollmentId: z.string(),
            status: z.enum(["active", "pending"]),
        }),
        verificationConfig: z.object({
            btApiKey: z.string(),
            environment: z.enum(["production", "sandbox"]),
        }),
    }),
};
export type PaymentMethodManagementIncomingEventMap = typeof paymentMethodManagementIncomingEvents;
