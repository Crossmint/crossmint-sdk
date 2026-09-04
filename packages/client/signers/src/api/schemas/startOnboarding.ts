import { z } from "zod";

export const startOnboardingRequestSchema = z.object({
    authId: z.string(),
    deviceId: z.string(),
    encryptionContext: z.object({
        publicKey: z.string(),
    }),
});
export type StartOnboardingRequest = z.infer<typeof startOnboardingRequestSchema>;

export const startOnboardingResponseSchema = z.object({});
export type StartOnboardingResponse = z.infer<typeof startOnboardingResponseSchema>;
