import { z } from "zod";

/**
 * Shadow Signer Storage Events
 *
 * These events are used for communication between React Native and the WebView
 * for shadow signer key storage and signing operations.
 */

// ===== Schemas =====

const GenerateKeyRequestSchema = z.object({
    walletAddress: z.string(),
    chain: z.string(),
});

const GenerateKeyResponseSchema = z.object({
    publicKeyBytes: z.array(z.number()),
});

const SignRequestSchema = z.object({
    walletAddress: z.string(),
    messageBytes: z.array(z.number()),
});

const SignResponseSchema = z.object({
    signatureBytes: z.array(z.number()),
});

const HasKeyRequestSchema = z.object({
    walletAddress: z.string(),
});

const HasKeyResponseSchema = z.object({
    exists: z.boolean(),
});

const DeleteKeyRequestSchema = z.object({
    walletAddress: z.string(),
});

const DeleteKeyResponseSchema = z.object({
    success: z.boolean(),
});

// ===== Event Maps =====

/**
 * Events sent from React Native to WebView (requests)
 */
export const shadowSignerStorageInboundEvents = {
    "request:shadow-storage-generate": GenerateKeyRequestSchema,
    "request:shadow-storage-sign": SignRequestSchema,
    "request:shadow-storage-has-key": HasKeyRequestSchema,
    "request:shadow-storage-delete": DeleteKeyRequestSchema,
} as const;

/**
 * Events sent from WebView to React Native (responses)
 */
export const shadowSignerStorageOutboundEvents = {
    "response:shadow-storage-generate": GenerateKeyResponseSchema,
    "response:shadow-storage-sign": SignResponseSchema,
    "response:shadow-storage-has-key": HasKeyResponseSchema,
    "response:shadow-storage-delete": DeleteKeyResponseSchema,
} as const;

// ===== Types =====

export type ShadowSignerStorageInboundEvents = typeof shadowSignerStorageInboundEvents;
export type ShadowSignerStorageOutboundEvents = typeof shadowSignerStorageOutboundEvents;

export type GenerateKeyRequest = z.infer<typeof GenerateKeyRequestSchema>;
export type GenerateKeyResponse = z.infer<typeof GenerateKeyResponseSchema>;
export type SignRequest = z.infer<typeof SignRequestSchema>;
export type SignResponse = z.infer<typeof SignResponseSchema>;
export type HasKeyRequest = z.infer<typeof HasKeyRequestSchema>;
export type HasKeyResponse = z.infer<typeof HasKeyResponseSchema>;
export type DeleteKeyRequest = z.infer<typeof DeleteKeyRequestSchema>;
export type DeleteKeyResponse = z.infer<typeof DeleteKeyResponseSchema>;
