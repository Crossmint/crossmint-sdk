import { FiatPrice } from ".";
import { PaymentElement } from "./paymentElement";
import { EmptyObject } from "./system";

export interface CrossmintCheckoutEvent<K extends CheckoutEvents = CheckoutEvents> {
    type: K;
    payload: CheckoutEventMap[K];
}
export type CrossmintCheckoutEventUnion = {
    [K in CheckoutEvents]: CrossmintCheckoutEvent<K>;
}[CheckoutEvents];

// Event types
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

export const CheckoutOrderEvents = {
    ORDER_PROCESS_STARTED: "order:process.started",
    ORDER_PROCESS_FINISHED: "order:process.finished",
} as const;
export type CheckoutOrderEvents = (typeof CheckoutOrderEvents)[keyof typeof CheckoutOrderEvents];

export const CheckoutQuoteEvents = {
    QUOTE_STATUS_CHANGED: "quote:status.changed",
    QUOTE_STATUS_INVALIDATED: "quote:status.invalidated",
} as const;
export type CheckoutQuoteEvents = (typeof CheckoutQuoteEvents)[keyof typeof CheckoutQuoteEvents];

export const CheckoutRecipientEvents = {
    RECIPIENT_WALLET_CHANGED: "recipient:wallet.changed",
    RECIPIENT_EMAIL_CHANGED: "recipient:email.changed",
} as const;
export type CheckoutRecipientEvents = (typeof CheckoutRecipientEvents)[keyof typeof CheckoutRecipientEvents];

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

export const CheckoutErrorEvents = {
    ...CheckoutPaymentErrorEvents,
    ...CheckoutTransactionErrorEvents,
} as const;
export type CheckoutErrorEvents = (typeof CheckoutErrorEvents)[keyof typeof CheckoutErrorEvents];

export const CheckoutEvents = {
    ...CheckoutPaymentEvents,
    ...CheckoutOrderEvents,
    ...CheckoutQuoteEvents,
    ...CheckoutRecipientEvents,
    ...CheckoutTransactionEvents,
} as const;
export type CheckoutEvents = (typeof CheckoutEvents)[keyof typeof CheckoutEvents];

export interface CheckoutEventMap {
    [CheckoutEvents.PAYMENT_PREPARATION_SUCCEEDED]: EmptyObject;
    [CheckoutEvents.QUOTE_STATUS_CHANGED]: InitialQuotePayload;
    [CheckoutEvents.QUOTE_STATUS_INVALIDATED]: EmptyObject;
    [CheckoutEvents.PAYMENT_PROCESS_STARTED]: EmptyObject;
    [CheckoutEvents.PAYMENT_PREPARATION_FAILED]: CrossmintEventErrorPayload;
    [CheckoutEvents.PAYMENT_PROCESS_SUCCEEDED]: PaymentCompletedPayload;
    [CheckoutEvents.PAYMENT_PROCESS_CANCELED]: EmptyObject;
    [CheckoutEvents.PAYMENT_PROCESS_REJECTED]: PaymentRejectedPayload;
    [CheckoutEvents.ORDER_PROCESS_STARTED]: EmptyObject;
    [CheckoutEvents.TRANSACTION_FULFILLMENT_SUCCEEDED]: TransactionFulfillmentSucceededPayload;
    [CheckoutEvents.TRANSACTION_FULFILLMENT_FAILED]: TransactionFulfillmentFailedPayload;
    [CheckoutEvents.ORDER_PROCESS_FINISHED]: OrderProcessFinishedPayload;
    [CheckoutEvents.RECIPIENT_WALLET_CHANGED]: RecipientWalletChangedPayload;
    [CheckoutEvents.RECIPIENT_EMAIL_CHANGED]: RecipientEmailChangedPayload;
}

export interface CrossmintEventError {
    message: string;
    code: string;
}

export interface CrossmintEventErrorPayload {
    error: CrossmintEventError;
}

export interface LineItem {
    price: FiatPrice;
    gasFee?: FiatPrice;
    metadata: LineItemMetadata;
    quantity: number;
}

export interface LineItemMetadata {
    imageUrl?: string;
    description?: string;
    title?: string;
    collection?: string;
}

export interface InitialQuotePayload {
    totalPrice: FiatPrice;
    lineItems: LineItem[];
}

interface PaymentRejectedPayload extends CrossmintEventErrorPayload {
    orderIdentifier: string;
    paymentMethodType: PaymentMethodType;
}

interface PaymentCompletedPayload {
    orderIdentifier: string;
}

interface TransactionBase {
    transactionIdentifier: string;
    price: FiatPrice;
}

interface EvmTransaction {
    contractAddress: string;
    tokenIds: string[];
}

interface SolanaTransaction {
    mintHash: string;
}

type TransactionFulfillmentSucceededPayload = TransactionBase & {
    txId: string;
} & (EvmTransaction | SolanaTransaction);

interface TransactionFulfillmentFailedPayload extends TransactionBase {
    error: CrossmintEventError;
}

interface OrderProcessFinishedPayload {
    successfulTransactionIdentifiers: string[];
    failedTransactionIdentifiers: string[];
    verification: { required: false } | { required: true; url: string };
    totalPrice: FiatPrice;
    paymentMethodType: PaymentMethodType;
}

export const PaymentMethodType = {
    // TODO: Think granularity for crypto payments.
    CREDIT_CARD: "credit-card",
    GOOGLE_PAY: "google-pay",
    APPLE_PAY: "apple-pay",
} as const;
export type PaymentMethodType = (typeof PaymentMethodType)[keyof typeof PaymentMethodType];

interface RecipientWalletChangedPayload {
    wallet: string;
}
interface RecipientEmailChangedPayload {
    email: string;
}

// Internal SDK events
export const PaymentElementSDKEvents = {
    PARAMS_UPDATE: "params-update",
} as const;
export type PaymentElementSDKEvents = (typeof PaymentElementSDKEvents)[keyof typeof PaymentElementSDKEvents];

export type ParamsUpdatePayload = Partial<Record<keyof Omit<PaymentElement, "onEvent" | "environment">, any>>;

export interface SDKEventMap {
    [PaymentElementSDKEvents.PARAMS_UPDATE]: ParamsUpdatePayload;
}

// Internal UI events
export const UIEvents = {
    UI_HEIGHT_CHANGED: "ui:height.changed",
} as const;
export type UIEvents = (typeof UIEvents)[keyof typeof UIEvents];

export interface UiEventMap {
    [UIEvents.UI_HEIGHT_CHANGED]: { height: number };
}

// Misc
export interface ListenToMintingEventsProps {
    orderIdentifier: string;
}

export type ListenerType = (event: CrossmintCheckoutEventUnion) => any;
