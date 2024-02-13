export const IncomingInternalEvents = {
    UI_HEIGHT_CHANGED: "ui:height.changed",
    CRYPTO_PAYMENT_INCOMING_TRANSACTION: "crypto-payment:incoming-transaction",
    CRYPTO_CHAIN_SWITCH: "crypto-payment:chain-switch",
} as const;
export type IncomingInternalEvents = (typeof IncomingInternalEvents)[keyof typeof IncomingInternalEvents];

export const OutgoingInternalEvents = {
    PARAMS_UPDATE: "params-update",
    CRYPTO_PAYMENT_USER_ACCEPTED: "crypto-payment:user-accepted",
    CRYPTO_PAYMENT_USER_REJECTED: "crypto-payment:user-rejected",
} as const;
export type OutgoingInternalEvents = (typeof OutgoingInternalEvents)[keyof typeof OutgoingInternalEvents];

// All internal events
export const CrossmintInternalEvents = {
    ...IncomingInternalEvents,
    ...OutgoingInternalEvents,
} as const;
export type CrossmintInternalEvents = (typeof CrossmintInternalEvents)[keyof typeof CrossmintInternalEvents];
