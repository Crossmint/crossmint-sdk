import { CheckoutEvents, CrossmintEventError, CrossmintEventErrorPayload, PaymentElementSDKEvents } from "./events";
import { Currency, Locale, PaymentMethod, UIConfig } from "./types";

export type Recipient = {
    email?: string;
    wallet?: string;
};

export interface CrossmintCheckoutEvent<K extends CheckoutEvents = CheckoutEvents> {
    type: K;
    payload: CheckoutEventMap[K];
}

export type MintConfig = Record<string, any> | Record<string, any>[];

// TODO: Remmeber to update this same interface in the Vue component aswell.
// packages/ui/vue-ui/src/components/CrossmintPaymentElement.vue
export interface PaymentElement {
    clientId: string;
    mintConfig?: MintConfig;
    recipient?: Recipient;
    paymentMethod?: PaymentMethod;
    currency?: Currency;
    locale?: Locale;
    uiConfig?: UIConfig;
    environment?: string;
    onEvent?(event: CrossmintCheckoutEvent): this;
}

export interface FiatPrice {
    amount: string;
    currency: Currency;
}

export interface LineItemMetadata {
    imageUrl?: string;
    description?: string;
    title?: string;
    collection?: string;
}

export interface LineItem {
    price: FiatPrice;
    gasFee?: FiatPrice;
    metadata: LineItemMetadata;
    quantity: number;
}

export interface InitialQuoteOutput {
    totalPrice: FiatPrice;
    lineItems: LineItem[];
}

interface PaymentRejectedPayload extends CrossmintEventErrorPayload {
    orderIdentifier: string;
    paymentMethodType: PaymentMethodType;
}

type EmptyObject = Record<string, never>;

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

interface TransactionFulfillmentFailed extends TransactionBase {
    error: CrossmintEventError;
}

type Verification = { required: false } | { required: true; url: string };

export const PaymentMethodType = {
    // TODO: Think granularity for crypto payments
    CREDIT_CARD: "credit-card",
    GOOGLE_PAY: "google-pay",
    APPLE_PAY: "apple-pay",
} as const;
export type PaymentMethodType = (typeof PaymentMethodType)[keyof typeof PaymentMethodType];

interface OrderProcessFinished {
    successfulTransactionIdentifiers: string[];
    failedTransactionIdentifiers: string[];
    verification: Verification;
    totalPrice: FiatPrice;
    paymentMethodType: PaymentMethodType;
}

interface RecipientWalletChanged {
    wallet: string;
}

export interface CheckoutEventMap {
    [CheckoutEvents.PAYMENT_PREPARATION_SUCCEEDED]: EmptyObject;
    [CheckoutEvents.QUOTE_STATUS_CHANGED]: InitialQuoteOutput;
    [CheckoutEvents.QUOTE_STATUS_INVALIDATED]: EmptyObject;
    [CheckoutEvents.PAYMENT_PROCESS_STARTED]: EmptyObject;
    [CheckoutEvents.PAYMENT_PREPARATION_FAILED]: CrossmintEventErrorPayload;
    [CheckoutEvents.PAYMENT_PROCESS_SUCCEEDED]: PaymentCompletedPayload;
    [CheckoutEvents.PAYMENT_PROCESS_CANCELED]: EmptyObject;
    [CheckoutEvents.PAYMENT_PROCESS_REJECTED]: PaymentRejectedPayload;
    [CheckoutEvents.ORDER_PROCESS_STARTED]: EmptyObject;
    [CheckoutEvents.TRANSACTION_FULFILLMENT_SUCCEEDED]: TransactionFulfillmentSucceededPayload;
    [CheckoutEvents.TRANSACTION_FULFILLMENT_FAILED]: TransactionFulfillmentFailed;
    [CheckoutEvents.ORDER_PROCESS_FINISHED]: OrderProcessFinished;
    [CheckoutEvents.RECIPIENT_WALLET_CHANGED]: RecipientWalletChanged;
}

export type ParamsUpdatePayload = Partial<Record<keyof Omit<PaymentElement, "onEvent" | "environment">, any>>;

export interface SDKEventMap {
    [PaymentElementSDKEvents.PARAMS_UPDATE]: ParamsUpdatePayload;
}
