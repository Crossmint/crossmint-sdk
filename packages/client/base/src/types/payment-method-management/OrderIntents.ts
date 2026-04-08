import type { ObjectValues } from "@crossmint/common-sdk-base";

export const OrderIntentPhase = {
    REQUIRES_PAYMENT: "requires-payment-method",
    REQUIRES_VERIFICATION: "requires-verification",
    ACTIVE: "active",
    EXPIRED: "expired",
};
export type OrderIntentPhase = ObjectValues<typeof OrderIntentPhase>;
export interface OrderIntentBase {
    orderIntentId: string;
    phase: OrderIntentPhase;
    mandates: any[];
}

export interface OrderIntent extends OrderIntentBase {
    payment: {
        btAgentId: string;
        btInstructionId: string;
    };
}

export interface VerificationConfig {
    btApiKey: string;
    environment: "production" | "sandbox";
}
