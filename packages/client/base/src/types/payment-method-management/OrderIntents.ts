import type { PaymentMethodAgenticEnrollmentVerificationConfig } from "./PaymentMethodAgenticEnrollment";

export type OrderIntentStatus = "active" | "cancelled" | "expired";
export type OrderIntentProvider = "vic" | "agentpay";
export type OrderIntentCredentialFormat = "card" | "network-token";

interface OrderIntentRailBase {
    rail: "agentic-token";
    provider: OrderIntentProvider;
    credentialFormats: OrderIntentCredentialFormat[];
}

export type OrderIntentRail =
    | (OrderIntentRailBase & { status: "active" | "pending_verification"; error?: never })
    | (OrderIntentRailBase & { status: "error"; error: { code: string } });

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
