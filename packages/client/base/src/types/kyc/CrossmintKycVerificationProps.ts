/**
 * Credentials for a KYC session. Obtained from an order's
 * `payment.preparation.kyc`, either directly or via `onKycRequired`.
 */
export type KycCredentials = { provider: "persona"; inquiryId: string; sessionToken?: string };

export interface CrossmintKycVerificationProps {
    credentials: KycCredentials;
    locale?: string;
    onReady?: () => void;
    onComplete?: (result: { status: "completed" | "failed" }) => void;
    onError?: (error: { message: string }) => void;
}
