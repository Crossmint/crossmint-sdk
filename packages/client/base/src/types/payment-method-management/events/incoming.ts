import { z } from "zod";

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
            code: z
                .enum(["incomplete_card", "invalid_billing_address", "incomplete_bank_account", "unknown"])
                .catch("unknown"),
            message: z.string(),
        }),
        z.object({
            status: z.literal("failed"),
            code: z.enum(["save_failed", "select_failed", "unknown"]).catch("unknown"),
            message: z.string(),
        }),
        z.object({
            status: z.literal("unavailable"),
            code: z.enum(["not_ready", "timeout", "unknown"]).catch("unknown"),
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
    }),
    "payment-method:result": z.object({
        requestId: z.string().min(1),
        result: paymentMethodSubmitResultSchema,
    }),
};
export type PaymentMethodManagementIncomingEventMap = typeof paymentMethodManagementIncomingEvents;
