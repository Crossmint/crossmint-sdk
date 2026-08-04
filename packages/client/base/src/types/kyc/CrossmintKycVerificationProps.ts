import type { Locale } from "@/types";
import type { z } from "zod";

import type { kycVerificationIncomingEvents } from "./events/incoming";

/**
 * Credentials for a KYC session, read from an order's `payment.preparation.kyc`.
 * A merchant taking over the KYC step gets them from `useCrossmintCheckout()`.
 */
export type KycCredentials = { provider: "persona"; inquiryId: string; sessionToken?: string };

/** Provider-agnostic outcome. `unknown` is an unrecognised provider state, never a success. */
export type KycStatus = z.infer<(typeof kycVerificationIncomingEvents)["kyc:completed"]>["status"];

/** `retriable: false` means the flow is dead and the user cannot finish it. */
export type KycError = z.infer<(typeof kycVerificationIncomingEvents)["kyc:error"]>;

export interface CrossmintKycVerificationProps {
    credentials: KycCredentials;
    locale?: Locale;
    onReady?: () => void;
    onComplete?: (result: { status: KycStatus }) => void;
    onCancel?: () => void;
    onError?: (error: KycError) => void;
}
