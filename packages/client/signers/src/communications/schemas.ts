import { z } from "zod";

const SupportedChainLayer = z.enum(["solana", "evm"]);

const AuthenticatedEventRequest = z.object({
    authData: z.object({
        jwt: z.string(),
        apiKey: z.string(),
    }),
});

export const GetAttestationPayloadSchema = {
    request: z.object({
        challenge: z.string(),
    }),
    response: z.object({
        attestationDocument: z.record(z.string(), z.any()), // TODO: Refine this type
    }),
};

export const SignMessagePayloadSchema = {
    request: AuthenticatedEventRequest.extend({
        deviceId: z.string(),
        data: z.object({
            chainLayer: SupportedChainLayer,
            message: z.string(),
            encoding: z.enum(["base58"]).optional().default("base58"),
        }),
    }),
    response: z.object({
        signature: z.string(),
        publicKey: z.string(),
    }),
};

export const SignTransactionPayloadSchema = {
    request: AuthenticatedEventRequest.extend({
        deviceId: z.string(),
        data: z.object({
            transaction: z.string(),
            chainLayer: SupportedChainLayer,
            encoding: z.enum(["base58"]).optional().default("base58"),
        }),
    }),
    response: z.object({
        signature: z.string(),
        publicKey: z.string(),
    }),
};

export const CreateSignerPayloadSchema = {
    request: AuthenticatedEventRequest.extend({
        deviceId: z.string(),
        data: z.object({
            authId: z.string(),
        }),
    }),
    response: z.object({}),
};

export const SendEncryptedOtpPayloadSchema = {
    request: AuthenticatedEventRequest.extend({
        deviceId: z.string(),
        data: z.object({
            encryptedOtp: z.string(),
            chainLayer: SupportedChainLayer,
        }),
    }),
    response: z.object({
        address: z.string(),
    }),
};

export const GetPublicKeyPayloadSchema = {
    request: AuthenticatedEventRequest.extend({
        deviceId: z.string(),
        data: z.object({
            chainLayer: SupportedChainLayer,
        }),
    }),
    response: z.object({
        publicKey: z.string(),
    }),
};
