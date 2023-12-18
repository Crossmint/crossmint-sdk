// Payment events
export const CheckoutPaymentErrorEvents = {
    PAYMENT_PREPARATION_FAILED: "payment:preparation.failed",
    PAYMENT_PROCESS_CANCELED: "payment:process.canceled",
    PAYMENT_PROCESS_REJECTED: "payment:process.rejected",
} as const;
export type CheckoutPaymentErrorEvents = (typeof CheckoutPaymentErrorEvents)[keyof typeof CheckoutPaymentErrorEvents];

export const CheckoutPaymentEvents = {
    PAYMENT_PREPARATION_SUCCEEDED: "payment:preparation.succeeded",
    PAYMENT_PROCESS_STARTED: "payment:process.started",
    PAYMENT_PROCESS_SUCCEEDED: "payment:process.succeeded",
    ...CheckoutPaymentErrorEvents,
} as const;
export type CheckoutPaymentEvents = (typeof CheckoutPaymentEvents)[keyof typeof CheckoutPaymentEvents];

// Order events
export const CheckoutOrderEvents = {
    ORDER_PROCESS_STARTED: "order:process.started",
    ORDER_PROCESS_FINISHED: "order:process.finished",
} as const;
export type CheckoutOrderEvents = (typeof CheckoutOrderEvents)[keyof typeof CheckoutOrderEvents];

// Quote events
export const CheckoutQuoteEvents = {
    QUOTE_STATUS_CHANGED: "quote:status.changed",
    QUOTE_STATUS_INVALIDATED: "quote:status.invalidated",
} as const;
export type CheckoutQuoteEvents = (typeof CheckoutQuoteEvents)[keyof typeof CheckoutQuoteEvents];

// Recipient events
export const CheckoutRecipientEvents = {
    RECIPIENT_WALLET_CHANGED: "recipient:wallet.changed",
    RECIPIENT_EMAIL_CHANGED: "recipient:email.changed",
} as const;
export type CheckoutRecipientEvents = (typeof CheckoutRecipientEvents)[keyof typeof CheckoutRecipientEvents];

// Transaction events
export const CheckoutTransactionErrorEvents = {
    TRANSACTION_FULFILLMENT_FAILED: "transaction:fulfillment.failed",
} as const;
export type CheckoutTransactionErrorEvents =
    (typeof CheckoutTransactionErrorEvents)[keyof typeof CheckoutTransactionErrorEvents];

export const CheckoutTransactionEvents = {
    TRANSACTION_FULFILLMENT_SUCCEEDED: "transaction:fulfillment.succeeded",
    ...CheckoutTransactionErrorEvents,
} as const;
export type CheckoutTransactionEvents = (typeof CheckoutTransactionEvents)[keyof typeof CheckoutTransactionEvents];

// All public events
export const CrossmintEvents = {
    ...CheckoutPaymentEvents,
    ...CheckoutOrderEvents,
    ...CheckoutQuoteEvents,
    ...CheckoutRecipientEvents,
    ...CheckoutTransactionEvents,
} as const;
export type CrossmintEvents = (typeof CrossmintEvents)[keyof typeof CrossmintEvents];
