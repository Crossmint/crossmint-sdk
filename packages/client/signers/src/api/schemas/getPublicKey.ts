import { z } from "zod";

export const getPublicKeyRequestSchema = z.undefined();
export type GetPublicKeyRequest = z.infer<typeof getPublicKeyRequestSchema>;

export const getPublicKeyResponseSchema = z.object({
    publicKey: z.string(),
});
export type GetPublicKeyResponse = z.infer<typeof getPublicKeyResponseSchema>;
