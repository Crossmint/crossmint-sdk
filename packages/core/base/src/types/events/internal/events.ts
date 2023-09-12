// All internal events
export const CrossmintInternalEvents = {
    PARAMS_UPDATE: "params-update",
    UI_HEIGHT_CHANGED: "ui:height.changed",
    CRYPTO_PAYMENT_USER_ACCEPTED: "crypto-payment:user-accepted",
    CRYPTO_PAYMENT_USER_REJECTED: "crypto-payment:user-rejected",
} as const;
export type CrossmintInternalEvents = (typeof CrossmintInternalEvents)[keyof typeof CrossmintInternalEvents];
