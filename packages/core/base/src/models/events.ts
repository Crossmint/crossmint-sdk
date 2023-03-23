import { CheckoutEventMap, CrossmintCheckoutEvent } from "./paymentElement";

export interface CrossmintEventErrorPayload {
    error: {
        message: string;
        code: string;
    };
}

export const CheckoutEvents = {
    PAYMENT_PREPARATION_SUCCEEDED: "payment:preparation.succeeded",
    QUOTE_STATUS_CHANGED: "quote:status.changed",
    PAYMENT_PROCESS_STARTED: "payment:process.started",
    PAYMENT_PREPARATION_FAILED: "payment:preparation.failed",
    PAYMENT_PROCESS_SUCCEEDED: "payment:process.succeeded",
    PAYMENT_PROCESS_CANCELED: "payment:process.canceled",
    PAYMENT_PROCESS_REJECTED: "payment:process.rejected",
    MINTING_PROCESS_STARTED: "minting:process.started",
    TRANSACTION_FULFILLMENT_SUCCEEDED: "transaction:fulfillment.succeeded",
    TRANSACTION_FULFILLMENT_FAILED: "transaction:fulfillment.failed",
    MINTING_PROCESS_FINISHED: "minting:process.finished",
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
