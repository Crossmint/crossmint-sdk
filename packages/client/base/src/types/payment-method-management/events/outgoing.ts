import { z } from "zod";

export const paymentMethodManagementOutgoingEvents = {
    // The host's own submit button: the component resolves what is on screen (the selected
    // saved method, or the add-new form) and answers with `payment-method:result` carrying
    // the same requestId.
    "payment-method:submit": z.object({
        requestId: z.string().min(1),
    }),
};
export type PaymentMethodManagementOutgoingEventMap = typeof paymentMethodManagementOutgoingEvents;
