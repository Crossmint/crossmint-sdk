import type { z } from "zod";

import {
    CreateSignerPayloadSchema,
    GetAttestationPayloadSchema,
    GetPublicKeyPayloadSchema,
    GetStatusPayloadSchema,
    SendEncryptedOtpPayloadSchema,
    SignPayloadSchema,
} from "./schemas";

export const SIGNER_EVENTS = [
    "create-signer",
    "get-attestation",
    "send-otp",
    "get-public-key",
    "sign",
    "get-status",
] as const;
export type SignerIFrameEventName = (typeof SIGNER_EVENTS)[number];

export const signerInboundEvents = {
    "request:create-signer": CreateSignerPayloadSchema.request,
    "request:get-attestation": GetAttestationPayloadSchema.request,
    "request:send-otp": SendEncryptedOtpPayloadSchema.request,
    "request:get-public-key": GetPublicKeyPayloadSchema.request,
    "request:sign": SignPayloadSchema.request,
    "request:get-status": GetStatusPayloadSchema.request,
} as const;

export const signerOutboundEvents = {
    "response:create-signer": CreateSignerPayloadSchema.response,
    "response:get-attestation": GetAttestationPayloadSchema.response,
    "response:send-otp": SendEncryptedOtpPayloadSchema.response,
    "response:get-public-key": GetPublicKeyPayloadSchema.response,
    "response:sign": SignPayloadSchema.response,
    "response:get-status": GetStatusPayloadSchema.response,
} as const;

export type SignerInputEvent<E extends SignerIFrameEventName> = z.infer<(typeof signerInboundEvents)[`request:${E}`]>;
export type SignerOutputEvent<E extends SignerIFrameEventName> = z.infer<
    (typeof signerOutboundEvents)[`response:${E}`]
>;
