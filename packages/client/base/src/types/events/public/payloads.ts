import type { FiatPrice } from "@/types";

import type { EmptyObject } from "../../system";
import { CrossmintEvents } from "./events";

export interface CrossmintEventMap {
    [CrossmintEvents.PAYMENT_PREPARATION_SUCCEEDED]: EmptyObject;
    [CrossmintEvents.QUOTE_STATUS_CHANGED]: InitialQuotePayload;
    [CrossmintEvents.QUOTE_STATUS_INVALIDATED]: EmptyObject;
    [CrossmintEvents.PAYMENT_PROCESS_STARTED]: InitialQuotePayload;
    [CrossmintEvents.PAYMENT_PREPARATION_FAILED]: CrossmintEventErrorPayload;
    [CrossmintEvents.PAYMENT_PROCESS_SUCCEEDED]: PaymentCompletedPayload;
    [CrossmintEvents.PAYMENT_PROCESS_CANCELED]: EmptyObject;
    [CrossmintEvents.PAYMENT_PROCESS_REJECTED]: PaymentRejectedPayload;
    [CrossmintEvents.ORDER_PROCESS_STARTED]: EmptyObject;
    [CrossmintEvents.TRANSACTION_FULFILLMENT_SUCCEEDED]: TransactionFulfillmentSucceededPayload;
    [CrossmintEvents.TRANSACTION_FULFILLMENT_FAILED]: TransactionFulfillmentFailedPayload;
    [CrossmintEvents.ORDER_PROCESS_FINISHED]: OrderProcessFinishedPayload;
    [CrossmintEvents.RECIPIENT_WALLET_CHANGED]: RecipientWalletChangedPayload;
    [CrossmintEvents.RECIPIENT_EMAIL_CHANGED]: RecipientEmailChangedPayload;
    [CrossmintEvents.RECIPIENT_PHONE_CHANGED]: RecipientPhoneChangedPayload;
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

// Recipient phone changed
interface RecipientPhoneChangedPayload {
    phone: string;
}
