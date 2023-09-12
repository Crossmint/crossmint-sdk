import { FiatPrice } from "@/types";

import { EmptyObject } from "../../system";
import { CrossmintPublicEvents } from "./events";

export interface CrossmintPublicEventMap {
    [CrossmintPublicEvents.PAYMENT_PREPARATION_SUCCEEDED]: EmptyObject;
    [CrossmintPublicEvents.QUOTE_STATUS_CHANGED]: InitialQuotePayload;
    [CrossmintPublicEvents.QUOTE_STATUS_INVALIDATED]: EmptyObject;
    [CrossmintPublicEvents.PAYMENT_PROCESS_STARTED]: EmptyObject;
    [CrossmintPublicEvents.PAYMENT_PREPARATION_FAILED]: CrossmintEventErrorPayload;
    [CrossmintPublicEvents.PAYMENT_PROCESS_SUCCEEDED]: PaymentCompletedPayload;
    [CrossmintPublicEvents.PAYMENT_PROCESS_CANCELED]: EmptyObject;
    [CrossmintPublicEvents.PAYMENT_PROCESS_REJECTED]: PaymentRejectedPayload;
    [CrossmintPublicEvents.ORDER_PROCESS_STARTED]: EmptyObject;
    [CrossmintPublicEvents.TRANSACTION_FULFILLMENT_SUCCEEDED]: TransactionFulfillmentSucceededPayload;
    [CrossmintPublicEvents.TRANSACTION_FULFILLMENT_FAILED]: TransactionFulfillmentFailedPayload;
    [CrossmintPublicEvents.ORDER_PROCESS_FINISHED]: OrderProcessFinishedPayload;
    [CrossmintPublicEvents.RECIPIENT_WALLET_CHANGED]: RecipientWalletChangedPayload;
    [CrossmintPublicEvents.RECIPIENT_EMAIL_CHANGED]: RecipientEmailChangedPayload;
}

// Initial quote
export interface InitialQuotePayload {
    totalPrice: FiatPrice;
    lineItems: LineItem[];
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

// Error
export interface CrossmintEventErrorPayload {
    error: CrossmintEventError;
}
export interface CrossmintEventError {
    message: string;
    code: string;
}

// Payment completed
interface PaymentCompletedPayload {
    orderIdentifier: string;
}

// Payment rejected
interface PaymentRejectedPayload extends CrossmintEventErrorPayload {
    orderIdentifier: string;
    paymentMethodType: PaymentMethodType;
}
export const PaymentMethodType = {
    // TODO: Think granularity for crypto payments.
    CREDIT_CARD: "credit-card",
    GOOGLE_PAY: "google-pay",
    APPLE_PAY: "apple-pay",
} as const;
export type PaymentMethodType = (typeof PaymentMethodType)[keyof typeof PaymentMethodType];

// Transaction fulfillment success
type TransactionFulfillmentSucceededPayload = {
    transactionIdentifier: string;
    price: FiatPrice;
    txId: string;
} & (EVMTransaction | SolanaTransaction);
interface EVMTransaction {
    contractAddress: string;
    tokenIds: string[];
}
interface SolanaTransaction {
    mintHash: string;
}

// Transaction fulfillment failed
interface TransactionFulfillmentFailedPayload {
    transactionIdentifier: string;
    price: FiatPrice;
    error: CrossmintEventError;
}

// Order process finished
interface OrderProcessFinishedPayload {
    successfulTransactionIdentifiers: string[];
    failedTransactionIdentifiers: string[];
    verification: { required: false } | { required: true; url: string };
    totalPrice: FiatPrice;
    paymentMethodType: PaymentMethodType;
}

// Recipient wallet changed
interface RecipientWalletChangedPayload {
    wallet: string;
}

// Recipient email changed
interface RecipientEmailChangedPayload {
    email: string;
}
