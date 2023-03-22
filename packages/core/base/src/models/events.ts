import { CheckoutEventMap, CrossmintCheckoutEvent } from "./paymentElement";

export interface CrossmintEventErrorPayload {
    error: {
        message: string;
        code: string;
    };
}

export const CheckoutEvents = {
    PAYMENT_READY: "payment:ready",
    PAYMENT_QUOTE_CHANGED: "payment:quote-changed",
    PAYMENT_STARTED: "payment:started",
    PAYMENT_FAILED: "payment:failed",
    PAYMENT_COMPLETED: "payment:completed",
    PAYMENT_CANCELED: "payment:canceled",
    PAYMENT_REJECTED: "payment:rejected",
    MINTING_STARTED: "minting:started",
    MINTING_COMPLETED: "minting:completed",
    MINTING_FAILED: "minting:failed",
} as const;
export type CheckoutEvents = (typeof CheckoutEvents)[keyof typeof CheckoutEvents];

export const PaymentElementSDKEvents = {
    PARAMS_UPDATE: "params-update",
} as const;
export type PaymentElementSDKEvents = (typeof PaymentElementSDKEvents)[keyof typeof PaymentElementSDKEvents];

export interface ListenToMintingEventsProps {
    clientId: string;
    orderIdentifier: string;
}

export type ListenerType<T extends CheckoutEvents = CheckoutEvents> = (event: CrossmintCheckoutEvent<T>) => void;
