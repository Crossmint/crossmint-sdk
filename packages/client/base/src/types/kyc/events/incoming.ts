import { z } from "zod";

export const kycVerificationIncomingEvents = {
    "ui:height.changed": z.object({
        height: z.number(),
    }),
    "kyc:ready": z.object({}),
    "kyc:completed": z.object({
        status: z.enum([
            "verified",
            "pending-review",
            "pending-manual-review",
            "declined",
            "expired",
            "failed",
            "unknown",
        ]),
    }),
    "kyc:cancelled": z.object({}),
    "kyc:error": z.object({
        retriable: z.boolean(),
        reason: z.enum([
            "widget-unavailable",
            "invalid-configuration",
            "invalid-credentials",
            "provider-error",
            "unknown",
        ]),
        message: z.string(),
    }),
};
export type KycVerificationIncomingEventMap = typeof kycVerificationIncomingEvents;
