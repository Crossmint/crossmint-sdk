import { z } from "zod";

export const startOnboardingRequestSchema = z.object({
    authId: z.string(),
    deviceId: z.string(),
    encryptionContext: z.object({
        publicKey: z.string(),
    }),
});
export type StartOnboardingRequest = z.infer<
    typeof startOnboardingRequestSchema
>;

export const startOnboardingResponseSchema = z.object({});
export type StartOnboardingResponse = z.infer<
    typeof startOnboardingResponseSchema
>;

export const completeOnboardingRequestSchema = z.object({
    publicKey: z.string(),
    onboardingAuthentication: z.object({
        otp: z.string(),
    }),
    deviceId: z.string(),
});
export type CompleteOnboardingRequest = z.infer<
    typeof completeOnboardingRequestSchema
>;

export const completeOnboardingResponseSchema = z.object({
    deviceKeyShare: z.string(),
    signerId: z.string(),
});
export type CompleteOnboardingResponse = z.infer<
    typeof completeOnboardingResponseSchema
>;
