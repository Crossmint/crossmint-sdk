import { z } from "zod";

const SupportedChainLayer = z.enum(["solana", "evm"]);

const AuthenticatedEventRequest = z.object({
    jwt: z.string(),
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
        chainLayer: SupportedChainLayer,
        message: z.string(),
        deviceId: z.string(),
        encoding: z.enum(["base58"]).optional().default("base58"),
    }),
    response: z.object({
        signature: z.string(),
        publicKey: z.string(),
    }),
};

export const SignTransactionPayloadSchema = {
    request: AuthenticatedEventRequest.extend({
        transaction: z.string(),
        chainLayer: SupportedChainLayer,
        deviceId: z.string(),
        encoding: z.enum(["base58"]).optional().default("base58"),
    }),
    response: z.object({
        signature: z.string(),
        publicKey: z.string(),
    }),
};

export const CreateSignerPayloadSchema = {
    request: AuthenticatedEventRequest.extend({
        authId: z.string(),
        deviceId: z.string(),
    }),
    response: z.object({}),
};

export const SendEncryptedOtpPayloadSchema = {
    request: AuthenticatedEventRequest.extend({
        encryptedOtp: z.string(),
        chainLayer: SupportedChainLayer,
        deviceId: z.string(),
    }),
    response: z.object({
        encryptedOtp: z.string(),
        address: z.string(),
    }),
};

export const GetPublicKeyPayloadSchema = {
    request: AuthenticatedEventRequest.extend({
        chainLayer: SupportedChainLayer,
        deviceId: z.string(),
    }),
    response: z.object({
        publicKey: z.string(),
    }),
};
