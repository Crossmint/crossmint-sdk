import { z } from "zod";

const SupportedChainLayer = z.enum(["solana", "evm"]);

const AuthenticatedEventRequest = z.object({
    authData: z.object({
        jwt: z.string(),
        apiKey: z.string(),
    }),
});

const ErrorResponse = z.object({
    status: z.literal("error"),
    error: z.string(),
    code: z.string().optional(),
    data: z.any().optional(),
});

const ResultResponse = <T extends z.ZodRawShape>(schema: z.ZodObject<T>) =>
    ErrorResponse.or(
        schema.extend({
            status: z.literal("success"),
        })
    );

export const GetAttestationPayloadSchema = {
    request: z.object({
        challenge: z.string(),
    }),
    response: ResultResponse(
        z.object({
            attestationDocument: z.record(z.string(), z.any()), // TODO: Refine this type
        })
    ),
};

export const SignMessagePayloadSchema = {
    request: AuthenticatedEventRequest.extend({
        data: z.object({
            chainLayer: SupportedChainLayer,
            message: z.string(),
            encoding: z.enum(["base58"]).optional().default("base58"),
        }),
    }),
    response: ResultResponse(
        z.object({
            signature: z.string(),
            publicKey: z.string(),
        })
    ),
};

export const SignTransactionPayloadSchema = {
    request: AuthenticatedEventRequest.extend({
        data: z.object({
            transaction: z.string(),
            chainLayer: SupportedChainLayer,
            encoding: z.enum(["base58"]).optional().default("base58"),
        }),
    }),
    response: ResultResponse(
        z.object({
            signature: z.string(),
            publicKey: z.string(),
        })
    ),
};

export const CreateSignerPayloadSchema = {
    request: AuthenticatedEventRequest.extend({
        data: z.object({
            authId: z.string(),
            chainLayer: SupportedChainLayer,
        }),
    }),
    response: ResultResponse(
        z.object({
            address: z.string(),
        })
    ),
};

export const SendEncryptedOtpPayloadSchema = {
    request: AuthenticatedEventRequest.extend({
        data: z.object({
            encryptedOtp: z.string(),
            chainLayer: SupportedChainLayer,
        }),
    }),
    response: ResultResponse(
        z.object({
            address: z.string(),
        })
    ),
};

export const GetPublicKeyPayloadSchema = {
    request: AuthenticatedEventRequest.extend({
        data: z.object({
            chainLayer: SupportedChainLayer,
        }),
    }),
    response: ResultResponse(
        z.object({
            publicKey: z.string(),
        })
    ),
};
