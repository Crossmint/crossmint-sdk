import { z } from "zod";

export const getAuthShardRequestSchema = z.undefined();
export type GetAuthShardRequest = z.infer<typeof getAuthShardRequestSchema>;

export const getAuthShardResponseSchema = z.object({
    signerId: z.string(),
    authKeyShare: z.string(),
    deviceKeyShareHash: z.string(),
});
export type GetAuthShardResponse = z.infer<typeof getAuthShardResponseSchema>;
