export enum CheckoutEvents {
    PAYMENT_READY = "payment:ready",
    PAYMENT_STARTED = "payment:started",
    PAYMENT_FAILED = "payment:failed",
    PAYMENT_COMPLETED = "payment:completed",
    PAYMENT_CANCELED = "payment:canceled",
    PAYMENT_REJECTED = "payment:rejected",
    MINTING_STARTED = "minting:started",
    MINTING_COMPLETED = "minting:completed",
    MINTING_FAILED = "minting:failed",
}

export enum PaymentElementSDKEvents {
    PARAMS_UPDATE = "params-update",
}

// TODO: Prepare payloads when ready
export type CheckoutEventMap = {
    [CheckoutEvents.PAYMENT_READY]: {
        example: string;
    };
};
