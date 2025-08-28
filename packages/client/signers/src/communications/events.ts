import type { z } from "zod";

import {
    GetAttestationPayloadSchema,
    GetStatusPayloadSchema,
    SignPayloadSchema,
    StartOnboardingPayloadSchema,
    CompleteOnboardingPayloadSchema,
    ExportSignerPayloadSchema,
} from "./schemas";

export const SIGNER_EVENTS = [
    "start-onboarding",
    "complete-onboarding",
    "sign",
    "get-status",
    "get-attestation",
] as const;
export type SignerIFrameEventName = (typeof SIGNER_EVENTS)[number];

export const signerInboundEvents = {
    "request:start-onboarding": StartOnboardingPayloadSchema.request,
    "request:get-attestation": GetAttestationPayloadSchema.request,
    "request:complete-onboarding": CompleteOnboardingPayloadSchema.request,
    "request:sign": SignPayloadSchema.request,
    "request:get-status": GetStatusPayloadSchema.request,
} as const;

export const signerOutboundEvents = {
    "response:start-onboarding": StartOnboardingPayloadSchema.response,
    "response:get-attestation": GetAttestationPayloadSchema.response,
    "response:complete-onboarding": CompleteOnboardingPayloadSchema.response,
    "response:sign": SignPayloadSchema.response,
    "response:get-status": GetStatusPayloadSchema.response,
} as const;
export type SignerInputEvent<E extends SignerIFrameEventName> = z.infer<(typeof signerInboundEvents)[`request:${E}`]>;
export type SignerOutputEvent<E extends SignerIFrameEventName> = z.infer<
    (typeof signerOutboundEvents)[`response:${E}`]
>;

export const EXPORT_SIGNER_EVENTS = ["export-signer"] as const;
export type ExportSignerEventName = (typeof EXPORT_SIGNER_EVENTS)[number];

export const exportSignerInboundEvents = {
    "request:export-signer": ExportSignerPayloadSchema.request,
} as const;

export const exportSignerOutboundEvents = {
    "response:export-signer": ExportSignerPayloadSchema.response,
} as const;

export type ExportSignerInputEvent<E extends ExportSignerEventName> = z.infer<
    (typeof exportSignerInboundEvents)[`request:${E}`]
>;
export type ExportSignerOutputEvent<E extends ExportSignerEventName> = z.infer<
    (typeof exportSignerOutboundEvents)[`response:${E}`]
>;
