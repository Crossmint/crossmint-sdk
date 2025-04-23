import type { z } from "zod";

import {
    CreateSignerPayloadSchema,
    GetAttestationPayloadSchema,
    GetPublicKeyPayloadSchema,
    SendEncryptedOtpPayloadSchema,
    SignMessagePayloadSchema,
    SignTransactionPayloadSchema,
} from "./schemas";

export const SIGNER_EVENTS = [
    "create-signer",
    "get-attestation",
    "sign-message",
    "sign-transaction",
    "send-otp",
    "get-public-key",
] as const;
export type SignerIFrameEventName = (typeof SIGNER_EVENTS)[number];

export const signerInboundEvents = {
    "request:create-signer": CreateSignerPayloadSchema.request,
    "request:get-attestation": GetAttestationPayloadSchema.request,
    "request:sign-message": SignMessagePayloadSchema.request,
    "request:sign-transaction": SignTransactionPayloadSchema.request,
    "request:send-otp": SendEncryptedOtpPayloadSchema.request,
    "request:get-public-key": GetPublicKeyPayloadSchema.request,
} as const;

export const signerOutboundEvents = {
    "response:create-signer": CreateSignerPayloadSchema.response,
    "response:get-attestation": GetAttestationPayloadSchema.response,
    "response:sign-message": SignMessagePayloadSchema.response,
    "response:sign-transaction": SignTransactionPayloadSchema.response,
    "response:send-otp": SendEncryptedOtpPayloadSchema.response,
    "response:get-public-key": GetPublicKeyPayloadSchema.response,
} as const;

export type SignerInputEvent<E extends SignerIFrameEventName> = z.infer<(typeof signerInboundEvents)[`request:${E}`]>;
export type SignerOutputEvent<E extends SignerIFrameEventName> = z.infer<
    (typeof signerOutboundEvents)[`response:${E}`]
>;
