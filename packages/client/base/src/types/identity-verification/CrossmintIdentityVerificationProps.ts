import type { Locale } from "@/types";
import type { z } from "zod";

import type { identityVerificationIncomingEvents } from "./events/incoming";

/**
 * Credentials for an identity verification session, read from an order's `payment.preparation.kyc`.
 * A merchant taking over the verification step gets them from `useCrossmintCheckout()`.
 */
export type IdentityVerificationCredentials = { provider: "persona"; inquiryId: string; sessionToken?: string };

/** Provider-agnostic outcome. `unknown` is an unrecognised provider state, never a success. */
export type IdentityVerificationStatus = z.infer<
    (typeof identityVerificationIncomingEvents)["kyc:completed"]
>["status"];

/** `retriable: false` means the flow is dead and the user cannot finish it. */
export type IdentityVerificationError = z.infer<(typeof identityVerificationIncomingEvents)["kyc:error"]>;

export interface CrossmintIdentityVerificationProps {
    credentials: IdentityVerificationCredentials;
    locale?: Locale;
    onReady?: () => void;
    onComplete?: (result: { status: IdentityVerificationStatus }) => void;
    onCancel?: () => void;
    onError?: (error: IdentityVerificationError) => void;
}
