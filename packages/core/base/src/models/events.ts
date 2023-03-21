export interface CrossmintEventErrorPayload {
    error: {
        message: string;
        code: string;
    };
}

export enum PaymentEvents {
    PAYMENT_READY = "payment:ready",
    PAYMENT_QUOTE_CHANGED = "payment:quote-changed",
    PAYMENT_STARTED = "payment:started",
    PAYMENT_FAILED = "payment:failed",
    PAYMENT_COMPLETED = "payment:completed",
    PAYMENT_CANCELED = "payment:canceled",
    PAYMENT_REJECTED = "payment:rejected",
}

export enum MintingEvents {
    MINTING_STARTED = "minting:started",
    MINTING_COMPLETED = "minting:completed",
    MINTING_FAILED = "minting:failed",
}

export const CheckoutEvents = { ...PaymentEvents, ...MintingEvents };
export type CheckoutEvents = typeof CheckoutEvents;

export enum PaymentElementSDKEvents {
    PARAMS_UPDATE = "params-update",
}
