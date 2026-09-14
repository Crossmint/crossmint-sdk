import type { PaymentMethodAgenticEnrollmentVerificationConfig } from "./PaymentMethodAgenticEnrollment";

export type OrderIntentStatus = "active" | "cancelled" | "expired";
export type OrderIntentProvider = "vic" | "agentpay";
export type OrderIntentCredentialFormat = "card" | "network-token";
export type OrderIntentSptCredentialFormat = "identifier";
export type OrderIntentRailStatus = "active" | "pending_verification" | "error";

type OrderIntentRailState =
    | { status: "active" | "pending_verification"; error?: never }
    | { status: "error"; error: { code: string } };

export type OrderIntentAgenticTokenRail = OrderIntentRailState & {
    rail: "agentic-token";
    provider: OrderIntentProvider;
    credentialFormats: OrderIntentCredentialFormat[];
};

export type OrderIntentEncryptedCardRail = OrderIntentRailState & {
    rail: "encrypted-card";
    provider?: never;
    credentialFormats: "card"[];
};

export type OrderIntentSptRail = OrderIntentRailState & {
    rail: "spt";
    provider: "stripe";
    credentialFormats: OrderIntentSptCredentialFormat[];
};

export type OrderIntentRail = OrderIntentAgenticTokenRail | OrderIntentEncryptedCardRail | OrderIntentSptRail;

export interface OrderIntentVerificationConfig extends PaymentMethodAgenticEnrollmentVerificationConfig {
    allowanceId: string;
}

interface OrderIntentBase {
    orderIntentId: string;
    paymentMethodId: string;
    status: OrderIntentStatus;
    amount: {
        total: string;
        spent: string;
        reserved: string;
        available: string;
        currency: string;
    };
    description: string;
    rails: OrderIntentRail[];
    expiresAt: string;
}

export interface OrderIntentWithVerification extends OrderIntentBase {
    verificationConfig: OrderIntentVerificationConfig;
}

export interface OrderIntentWithoutVerification extends OrderIntentBase {
    verificationConfig?: never;
}

export type OrderIntent = OrderIntentWithVerification | OrderIntentWithoutVerification;
