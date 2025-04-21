import { z } from "zod";

const SupportedChainLayer = z.enum(["solana", "evm"]);

const VersionedEvent = z.object({
    version: z.number(),
});

const AuthenticatedEvent = VersionedEvent.extend({
    jwt: z.string(),
    publicKey: z.string(),
});

export const GetAttestationPayloadSchema = {
    request: VersionedEvent,
    response: VersionedEvent.extend({
        attestationDocument: z.record(z.string(), z.any()),
    }),
};

export const SignMessagePayloadSchema = {
    request: AuthenticatedEvent.extend({
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
    request: AuthenticatedEvent.extend({
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
    request: AuthenticatedEvent.extend({}),
    response: VersionedEvent.extend({
        signerId: z.string(),
    }),
};

export const SendEncryptedOtpPayloadSchema = {
    request: AuthenticatedEvent.extend({
        encryptedOtp: z.string(),
    }),
    response: VersionedEvent.extend({
        encryptedOtp: z.string(),
    }),
};
