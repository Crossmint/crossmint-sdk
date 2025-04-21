import {
    CreateSignerPayloadSchema,
    GetAttestationPayloadSchema,
    SendEncryptedOtpPayloadSchema,
    SignMessagePayloadSchema,
    SignTransactionPayloadSchema,
} from "./schemas";

export const SecureSignerIFrameEventNames = [
    "create-signer",
    "get-attestation",
    "sign-message",
    "sign-transaction",
    "send-otp",
] as const;

export type SecureSignerIFrameEventName = (typeof SecureSignerIFrameEventNames)[number];

export const SecureSignerInboundEvents = {
    "request:create-signer": CreateSignerPayloadSchema.request,
    "request:get-attestation": GetAttestationPayloadSchema.request,
    "request:sign-message": SignMessagePayloadSchema.request,
    "request:sign-transaction": SignTransactionPayloadSchema.request,
    "request:send-otp": SendEncryptedOtpPayloadSchema.request,
} as const;

export const SecureSignerOutboundEvents = {
    "response:create-signer": CreateSignerPayloadSchema.response,
    "response:get-attestation": GetAttestationPayloadSchema.response,
    "response:sign-message": SignMessagePayloadSchema.response,
    "response:sign-transaction": SignTransactionPayloadSchema.response,
    "response:send-otp": SendEncryptedOtpPayloadSchema.response,
} as const;
