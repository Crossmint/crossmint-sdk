import { z } from "zod";

export const kycVerificationIncomingEvents = {
    "ui:height.changed": z.object({
        height: z.number(),
    }),
    "kyc:ready": z.object({}),
    "kyc:completed": z.object({
        status: z.enum(["completed", "failed"]),
    }),
    "kyc:error": z.object({
        message: z.string(),
    }),
};
export type KycVerificationIncomingEventMap = typeof kycVerificationIncomingEvents;
