export interface PaymentMethodAgenticEnrollmentWithoutVerificationConfig {
    enrollmentId: string;
    status: "active";
}
export interface PaymentMethodAgenticEnrollmentWithVerificationConfig {
    enrollmentId: string;
    status: "pending";
    verificationConfig: PaymentMethodAgenticEnrollmentVerificationConfig;
}
export interface PaymentMethodAgenticEnrollmentVerificationConfig {
    environment: "production" | "sandbox";
    // This is the BT client-side api key, we are intentionally not using "basis theory" in the name
    publicApiKey: string;
}
export type PaymentMethodAgenticEnrollment =
    | PaymentMethodAgenticEnrollmentWithoutVerificationConfig
    | PaymentMethodAgenticEnrollmentWithVerificationConfig;
