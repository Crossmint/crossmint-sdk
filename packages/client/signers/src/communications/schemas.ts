import { z } from "zod";

const KeyTypeSchema = z.enum(["secp256k1", "ed25519"]).describe("Type of cryptographic key");
export const KEY_TYPES = Object.values(KeyTypeSchema.options);
export type KeyType = z.infer<typeof KeyTypeSchema>;
const EncodingSchema = z.enum(["base58", "base64", "hex"]).describe("Encoding format for the key or data");
export type Encoding = z.infer<typeof EncodingSchema>;
export const KEY_ENCODINGS = Object.values(EncodingSchema.options);

const UserPublicKeySchema = z.object({
    bytes: z.string().describe("The encoded public key value"),
    encoding: EncodingSchema.describe("The encoding format of the public key payload"),
    keyType: KeyTypeSchema.describe("The cryptographic algorithm of the public key"),
});

const SignatureSchema = z.object({
    bytes: z.string().describe("The encoded signature value"),
    encoding: EncodingSchema.describe("The encoding format of the signature payload"),
});

const PublicKeyMappingSchema = z.record(KeyTypeSchema, UserPublicKeySchema.omit({ keyType: true }));
const ReadySignerResponseSchema = z.object({
    signerStatus: z.enum(["ready"]).describe("Current status of the signer"),
    publicKeys: PublicKeyMappingSchema.describe("The public keys of the created signer"),
});
const NewDeviceSignerResponseSchema = z.object({
    signerStatus: z.enum(["new-device"]).describe("Current status of the signer"),
});

const AuthenticatedEventRequest = z.object({
    authData: z
        .object({
            jwt: z.string().describe("JSON Web Token for authentication"),
            apiKey: z.string().describe("API key for authorization"),
        })
        .describe("Authentication data for the request"),
});

const OnboardingAuthenticationDataSchema = z.object({
    encryptedOtp: z.string().describe("Encrypted one-time password"),
});

const ErrorResponse = z.object({
    status: z.literal("error"),
    error: z.string(),
    code: z.string().optional(),
    data: z.any().optional().describe("Optional additional error data"),
});

const ResultResponse = <T extends z.ZodTypeAny>(schema: T) =>
    ErrorResponse.or(z.object({ status: z.literal("success") }).and(schema));

export const StartOnboardingPayloadSchema = {
    request: AuthenticatedEventRequest.extend({
        data: z
            .object({
                authId: z.string().describe("Authentication identifier for the signer"),
            })
            .describe("Data needed to create a new signer"),
    }),
    response: ResultResponse(z.union([ReadySignerResponseSchema, NewDeviceSignerResponseSchema])),
};

export const CompleteOnboardingPayloadSchema = {
    request: AuthenticatedEventRequest.extend({
        data: z
            .object({
                onboardingAuthentication: OnboardingAuthenticationDataSchema,
            })
            .describe("Data needed for encrypted OTP verification"),
    }),
    response: ResultResponse(ReadySignerResponseSchema),
};

export const GetPublicKeyPayloadSchema = {
    request: AuthenticatedEventRequest.extend({
        data: z
            .object({
                keyType: KeyTypeSchema.describe("Type of cryptographic key to retrieve"),
            })
            .describe("Data specifying which public key to retrieve"),
    }),
    response: ResultResponse(
        z.object({
            publicKey: UserPublicKeySchema.describe("The requested public key"),
        })
    ),
};

export const GetStatusPayloadSchema = {
    request: AuthenticatedEventRequest,
    response: ResultResponse(z.union([ReadySignerResponseSchema, NewDeviceSignerResponseSchema])),
};

export const SignPayloadSchema = {
    request: AuthenticatedEventRequest.extend({
        data: z
            .object({
                keyType: KeyTypeSchema.describe("Type of cryptographic key to use for signing"),
                bytes: z.string().describe("Data to be signed, in encoded format"),
                encoding: EncodingSchema.describe("Encoding of the data to be signed"),
            })
            .describe("Data needed to create a signature"),
    }),
    response: ResultResponse(
        z.object({
            signature: SignatureSchema.describe("The generated signature"),
            publicKey: UserPublicKeySchema.describe("The public key that signed the data"),
        })
    ),
};

export const ExportSignerPayloadSchema = {
    request: AuthenticatedEventRequest.extend({
        data: z
            .object({
                scheme: z
                    .union([z.literal("ed25519"), z.literal("secp256k1")])
                    .describe("The cryptographic scheme to use"),
                encoding: z
                    .union([z.literal("base58"), z.literal("hex"), z.literal("strkey")])
                    .describe("Encoding format for the private key"),
            })
            .describe("Data needed to export the signer"),
    }),
    response: ResultResponse(
        z.object({
            // No privateKey field - the private key is handled within the iframe
            // and copied to clipboard when the button is clicked
        })
    ),
};

export const IndexedDBFatalErrorSchema = z.object({
    error: z.string().describe("Error message describing the IndexedDB failure"),
    operation: z.string().optional().describe("The operation that was being attempted"),
    phase: z.enum(["pre-flight-check"]).describe("The phase where the error occurred"),
});
