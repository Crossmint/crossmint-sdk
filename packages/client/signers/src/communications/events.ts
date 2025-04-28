import type { z } from "zod";

import {
    CreateSignerPayloadSchema,
    GetAttestationPayloadSchema,
    GetPublicKeyPayloadSchema,
    SendEncryptedOtpPayloadSchema,
    SignMessagePayloadSchema,
    SignPayloadSchema,
    SignTransactionPayloadSchema,
} from "./schemas";

export const SIGNER_EVENTS = [
    "create-signer",
    "get-attestation",
    "sign-message", // Deprecated, use sign instead
    "sign-transaction", // Deprecated, use sign instead
    "send-otp",
    "get-public-key",
    "sign",
] as const;
export type SignerIFrameEventName = (typeof SIGNER_EVENTS)[number];

export const signerInboundEvents = {
    "request:create-signer": CreateSignerPayloadSchema.request,
    "request:get-attestation": GetAttestationPayloadSchema.request,
    "request:sign-message": SignMessagePayloadSchema.request,
    "request:sign-transaction": SignTransactionPayloadSchema.request,
    "request:send-otp": SendEncryptedOtpPayloadSchema.request,
    "request:get-public-key": GetPublicKeyPayloadSchema.request,
    "request:sign": SignPayloadSchema.request,
} as const;

export const signerOutboundEvents = {
    "response:create-signer": CreateSignerPayloadSchema.response,
    "response:get-attestation": GetAttestationPayloadSchema.response,
    "response:sign-message": SignMessagePayloadSchema.response,
    "response:sign-transaction": SignTransactionPayloadSchema.response,
    "response:send-otp": SendEncryptedOtpPayloadSchema.response,
    "response:get-public-key": GetPublicKeyPayloadSchema.response,
    "response:sign": SignPayloadSchema.response,
} as const;

export type SignerInputEvent<E extends SignerIFrameEventName> = z.infer<(typeof signerInboundEvents)[`request:${E}`]>;
export type SignerOutputEvent<E extends SignerIFrameEventName> = z.infer<
    (typeof signerOutboundEvents)[`response:${E}`]
>;
