import { z } from "zod";

const KeyTypeSchema = z
    .enum(["secp256k1", "ed25519"])
    .describe("Type of cryptographic key");
const EncodingSchema = z
    .enum(["base58", "base64"])
    .describe("Encoding format for the key or data");

const PublicKeySchema = z.object({
    bytes: z.string().describe("The encoded public key value"),
    encoding: EncodingSchema.describe(
        "The encoding format of the public key payload"
    ),
    keyType: KeyTypeSchema.describe(
        "The cryptographic algorithm of the public key"
    ),
});

const SignatureSchema = z.object({
    bytes: z.string().describe("The encoded signature value"),
    encoding: EncodingSchema.describe(
        "The encoding format of the signature payload"
    ),
});

const AuthenticatedEventRequest = z.object({
    authData: z
        .object({
            jwt: z.string().describe("JSON Web Token for authentication"),
            apiKey: z.string().describe("API key for authorization"),
        })
        .describe("Authentication data for the request"),
});

const ErrorResponse = z.object({
    status: z.literal("error"),
    error: z.string(),
    code: z.string().optional(),
    data: z.any().optional().describe("Optional additional error data"),
});

const ResultResponse = <T extends z.ZodRawShape>(schema: z.ZodObject<T>) =>
    ErrorResponse.or(
        schema.extend({
            status: z.literal("success"),
        })
    );

export const GetAttestationPayloadSchema = {
    request: z.object({
        challenge: z
            .string()
            .describe("Challenge string for attestation verification"), // TODO: Actually use this
    }),
    response: ResultResponse(
        z.object({
            // attestationDocument: z.object({
            //     quote: z.string(),
            // })
            attestationDocument: z
                .record(z.string(), z.any())
                .describe("Document containing the quote"), // TODO: Refine
        })
    ),
};

export const CreateSignerPayloadSchema = {
    request: AuthenticatedEventRequest.extend({
        data: z
            .object({
                authId: z
                    .string()
                    .describe("Authentication identifier for the signer"),
                keyType: KeyTypeSchema.describe(
                    "Type of cryptographic key to create"
                ),
            })
            .describe("Data needed to create a new signer"),
    }),
    response: ResultResponse(
        z.object({
            publicKey: PublicKeySchema.describe(
                "The public key of the created signer"
            ),
        })
    ),
};

export const SendEncryptedOtpPayloadSchema = {
    request: AuthenticatedEventRequest.extend({
        data: z
            .object({
                encryptedOtp: z
                    .string()
                    .describe("Encrypted one-time password"),
                keyType: KeyTypeSchema.describe(
                    "Type of cryptographic key to use"
                ),
            })
            .describe("Data needed for encrypted OTP verification"),
    }),
    response: ResultResponse(
        z.object({
            publicKey: PublicKeySchema.describe(
                "The public key created for the authenticated signer"
            ),
        })
    ),
};

export const GetPublicKeyPayloadSchema = {
    request: AuthenticatedEventRequest.extend({
        data: z
            .object({
                keyType: KeyTypeSchema.describe(
                    "Type of cryptographic key to retrieve"
                ),
            })
            .describe("Data specifying which public key to retrieve"),
    }),
    response: ResultResponse(
        z.object({
            publicKey: PublicKeySchema.describe("The requested public key"),
        })
    ),
};

export const GetStatusPayloadSchema = {
    request: AuthenticatedEventRequest,
    response: ResultResponse(
        z.object({
            signerStatus: z
                .enum(["ready", "new-device"])
                .describe("Current status of the signer"),
        })
    ),
};

export const SignPayloadSchema = {
    request: AuthenticatedEventRequest.extend({
        data: z
            .object({
                keyType: KeyTypeSchema.describe(
                    "Type of cryptographic key to use for signing"
                ),
                bytes: z
                    .string()
                    .describe("Data to be signed, in encoded format"),
                encoding: EncodingSchema.describe(
                    "Encoding of the data to be signed"
                ),
            })
            .describe("Data needed to create a signature"),
    }),
    response: ResultResponse(
        z.object({
            signature: SignatureSchema.describe("The generated signature"),
            publicKey: PublicKeySchema.describe(
                "The public key that signed the data"
            ),
        })
    ),
};
