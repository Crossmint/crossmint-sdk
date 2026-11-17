import { z } from "zod";
import {
    PAYMENT_METHOD_SUBMIT_FAILED_CODES,
    PAYMENT_METHOD_SUBMIT_INVALID_CODES,
    PAYMENT_METHOD_SUBMIT_UNAVAILABLE_CODES,
    type PaymentMethodManagementChangeEvent,
} from "../CrossmintPaymentMethodManagementProps";

// `paymentMethod` is the same shape `payment-method:selected` carries (CrossmintPaymentMethod);
// only the fields consumers narrow on are enforced, extra fields pass through.
const paymentMethodSchema = z.object({ type: z.string(), paymentMethodId: z.string() }).passthrough();

// A missing or unknown `code` (an older or newer iframe) becomes "unknown"; the result still resolves.
const paymentMethodSubmitResultSchema = z.union([
    z.discriminatedUnion("status", [
        z.object({ status: z.literal("selected"), paymentMethod: paymentMethodSchema }),
        z.object({ status: z.literal("saved"), paymentMethod: paymentMethodSchema }),
        z.object({
            status: z.literal("invalid"),
            code: z.enum(PAYMENT_METHOD_SUBMIT_INVALID_CODES).catch("unknown"),
            message: z.string(),
        }),
        z.object({
            status: z.literal("failed"),
            code: z.enum(PAYMENT_METHOD_SUBMIT_FAILED_CODES).catch("unknown"),
            message: z.string(),
        }),
        z.object({
            status: z.literal("unavailable"),
            code: z.enum(PAYMENT_METHOD_SUBMIT_UNAVAILABLE_CODES).catch("unknown"),
            message: z.string(),
        }),
    ]),
    // A future iframe status still resolves instead of hanging the host until the submit timeout.
    z
        .object({ status: z.string(), message: z.string().optional() })
        .passthrough()
        .transform((result) => ({
            status: "failed" as const,
            code: "unknown" as const,
            message: result.message ?? "The payment method component returned an unexpected result. Please try again.",
        })),
]);

export const paymentMethodManagementIncomingEvents = {
    "ui:height.changed": z.object({
        height: z.number(),
    }),
    "payment-method:selected": z.any(),
    // Once per iframe document, when a submit can first select or save.
    "payment-method:ready": z.object({}).passthrough(),
    "payment-method:change": z.object({
        mode: z.enum(["new", "existing"]),
        empty: z.boolean(),
        complete: z.boolean(),
    }) satisfies z.ZodType<PaymentMethodManagementChangeEvent>,
    "payment-method:result": z.object({
        requestId: z.string().min(1),
        result: paymentMethodSubmitResultSchema,
    }),
};
export type PaymentMethodManagementIncomingEventMap = typeof paymentMethodManagementIncomingEvents;
