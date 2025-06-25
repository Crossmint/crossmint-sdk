import { z } from "zod";

export const getAttestationRequestSchema = z.undefined();
export type GetAttestationRequest = z.infer<typeof getAttestationRequestSchema>;

export const getAttestationResponseSchema = z.object({
    publicKey: z.string(),
    quote: z.string(),
    event_log: z.string(),
    hash_algorithm: z.literal("sha512"),
    prefix: z.literal("app-data"),
});
export type GetAttestationResponse = z.infer<
    typeof getAttestationResponseSchema
>;

export const getPublicKeyRequestSchema = z.undefined();
export type GetPublicKeyRequest = z.infer<typeof getPublicKeyRequestSchema>;

export const getPublicKeyResponseSchema = z.object({
    publicKey: z.string(),
});
export type GetPublicKeyResponse = z.infer<typeof getPublicKeyResponseSchema>;
