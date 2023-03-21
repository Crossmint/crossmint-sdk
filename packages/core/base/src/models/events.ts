export interface CrossmintEvent {
    type: string;
    payload: Record<string, any>;
}

export interface CrossmintEventErrorPayload {
    error: boolean;
    message: string;
    code: string;
}

export enum CheckoutEvents {
    PAYMENT_READY = "payment:ready",
    PAYMENT_QUOTE_CHANGED = "payment:quote-changed",
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
