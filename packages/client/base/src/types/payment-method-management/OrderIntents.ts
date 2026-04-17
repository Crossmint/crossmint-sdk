import type { ObjectValues } from "@crossmint/common-sdk-base";
import type { PaymentMethodAgenticEnrollmentVerificationConfig } from "./PaymentMethodAgenticEnrollment";

export const OrderIntentPhase = {
    REQUIRES_PAYMENT: "requires-payment-method",
    REQUIRES_VERIFICATION: "requires-verification",
    ACTIVE: "active",
    EXPIRED: "expired",
};
export type OrderIntentPhase = ObjectValues<typeof OrderIntentPhase>;

interface OrderIntentBase {
    orderIntentId: string;
    mandates: any[];
    payment: {
        paymentMethodId: string;
    };
}
export interface OrderIntentWithVerification extends OrderIntentBase {
    phase: "requires-verification";
    verificationConfig: OrderIntentVerificationConfig;
}
export interface OrderIntentVerificationConfig extends PaymentMethodAgenticEnrollmentVerificationConfig {
    agentId: string;
    instructionId: string;
}
export interface OrderIntentWithoutVerification extends OrderIntentBase {
    phase: Exclude<OrderIntentPhase, "requires-verification">;
}
export type OrderIntent = OrderIntentWithVerification | OrderIntentWithoutVerification;
