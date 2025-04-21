import { z } from "zod";

const SupportedChainLayer = z.enum(["solana", "evm"]);

const VersionedEvent = z.object({
    version: z.number(),
});
const AuthenticatedEventRequest = VersionedEvent.extend({
    jwt: z.string(),
});

export const GetAttestationPayloadSchema = {
    request: VersionedEvent,
    response: VersionedEvent.extend({
        attestationDocument: z.record(z.string(), z.any()), // TODO: Refine this type
    }),
};

export const SignMessagePayloadSchema = {
    request: AuthenticatedEventRequest.extend({
        message: z.string(),
        chainLayer: SupportedChainLayer,
        encoding: z.enum(["base58"]).optional().default("base58"),
    }),
    response: VersionedEvent.extend({
        signature: z.string(),
        publicKey: z.string(),
    }),
};

export const SignTransactionPayloadSchema = {
    request: AuthenticatedEventRequest.extend({
        transaction: z.string(),
        chainLayer: SupportedChainLayer,
        encoding: z.enum(["base58"]).optional().default("base58"),
    }),
    response: VersionedEvent.extend({
        signature: z.string(),
        publicKey: z.string(),
    }),
};

export const CreateSignerPayloadSchema = {
    request: AuthenticatedEventRequest.extend({
        authId: z.string(),
    }),
    response: VersionedEvent.extend({
        signerId: z.string(),
    }),
};

export const SendEncryptedOtpPayloadSchema = {
    request: AuthenticatedEventRequest.extend({
        encryptedOtp: z.string(),
    }),
    response: VersionedEvent.extend({
        encryptedOtp: z.string(),
        publicKey: z.string(),
    }),
};
