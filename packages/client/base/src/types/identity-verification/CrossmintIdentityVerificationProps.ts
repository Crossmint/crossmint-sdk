import type { Locale } from "@/types";
import type { EmbeddedCheckoutV3Appearance } from "@/types/embed/v3/CrossmintEmbeddedCheckoutV3Props";
import type { z } from "zod";

import type { identityVerificationIncomingEvents } from "./events/incoming";

/**
 * Credentials for an identity verification session, read from an order's `payment.preparation.kyc`.
 * A merchant taking over the verification step gets them from `useCrossmintCheckout()`.
 * The order picks the shape, so pass them through as they come and do not read their fields.
 */
export type IdentityVerificationCredentials =
    | { provider: "persona"; inquiryId: string; sessionToken?: string }
    | { verificationId: string; clientSecret: string; deviceSessionKey?: string };

/**
 * Embedded checkout's appearance, so the same object themes both. `theme` forces light or dark;
 * without it, the flow reads it from `variables.colors.backgroundPrimary`.
 */
export type IdentityVerificationAppearance = EmbeddedCheckoutV3Appearance & { theme?: "light" | "dark" };

/** Provider-agnostic outcome. `unknown` is an unrecognised provider state, never a success. */
export type IdentityVerificationStatus = z.infer<
    (typeof identityVerificationIncomingEvents)["kyc:completed"]
>["status"];

/** `retriable: false` means the flow is dead and the user cannot finish it. */
export type IdentityVerificationError = z.infer<(typeof identityVerificationIncomingEvents)["kyc:error"]>;

export interface CrossmintIdentityVerificationProps {
    credentials: IdentityVerificationCredentials;
    appearance?: IdentityVerificationAppearance;
    locale?: Locale;
    onReady?: () => void;
    /** The flow ended with a result. Unmount here, not when the credentials go away: the order moves on first. */
    onComplete?: (result: { status: IdentityVerificationStatus }) => void;
    /** The user closed the flow: Done on a blocked screen, or closing document capture. Without it, Done does nothing. */
    onCancel?: () => void;
    onError?: (error: IdentityVerificationError) => void;
}
