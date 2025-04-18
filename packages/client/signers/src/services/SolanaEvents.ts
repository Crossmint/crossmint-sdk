// TODO: Rename these objects to something Solana related

import { z } from "zod";

export const AuthenticationDataSchema = z.object({
    signerAddress: z.string(), // TODO: Maybe remove
});

// Define incoming events (events that the iframe sends o us)
export const SecureIFrameParentIncomingEvents = {
    "response:sign-message": z.object({
        address: z.string(),
        signature: z.string(),
    }),
    "response:sign-transaction": z.object({
        transaction: z.string(), // Base58 serialized transaction
    }),
    "response:attestation": z.object({
        attestation: z.record(z.string(), z.any()),
    }),
    "response:get-public-key": z.object({
        publicKey: z.string(),
    }),
    "response:send-otp": z.object({
        success: z.boolean(),
    }),
    "response:create-signer": z.object({
        requestId: z.string(),
    }),
    error: z.object({
        code: z.number(),
        message: z.string(),
    }),
} as const;

// Define outgoing events (events that we send to the iframe)
// Still incomplete, should be extended
export const SecureIFrameParentOutgoingEvents = {
    "request:attestation": z.undefined(),
    "request:sign-message": AuthenticationDataSchema.extend({
        message: z.string(), // Base58 encoded message
    }),
    "request:sign-transaction": AuthenticationDataSchema.extend({
        transaction: z.string(), // Base58 serialized transaction
    }),
    "request:get-public-key": z.object({}),
    "request:send-otp": z.object({
        otp: z.string(),
        requestId: z.string(),
    }),
    "request:create-signer": z.object({
        userId: z.string(),
        projectId: z.string(),
        authId: z.string(),
    }),
} as const;
