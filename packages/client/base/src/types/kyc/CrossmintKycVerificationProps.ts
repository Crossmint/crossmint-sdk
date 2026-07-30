/**
 * Credentials for a KYC session, read from an order's `payment.preparation.kyc`.
 * A merchant taking over the KYC step gets them from `useCrossmintCheckout()`.
 */
export type KycCredentials = { provider: "persona"; inquiryId: string; sessionToken?: string };

export interface CrossmintKycVerificationProps {
    credentials: KycCredentials;
    locale?: string;
    onReady?: () => void;
    onComplete?: (result: { status: "completed" | "failed" }) => void;
    onError?: (error: { message: string }) => void;
}
