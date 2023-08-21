export const PaymentErrors = {
    MINT_CONFIG_INVALID: "payments:mint-config.invalid",
    PAYMENT_METHOD_INVALID: "payments:payment-method.invalid",
    EMAIL_INVALID: "payments:email.invalid",
    CLIENT_ID_INVALID: "payments:client-id.invalid",
    MINTING_CONTRACT_MISSING: "payments:minting-contract.missing",
    COLLECTION_DISABLED: "payments:collection.disabled",
    COLLECTION_UNAVAILABLE: "payments:collection.unavailable",
    COLLECTION_UNVERIFIED: "payments:collection.unverified",
    PROJECT_UNVERIFIED: "payments:project.unverified",
    COLLECTION_SOLD_OUT: "payments:collection.sold-out",
    COLLECTION_NOT_LIVE: "payments:collection.not-live",
    COLLECTION_SALE_ENDED: "payments:collection.sale-ended",
    USER_WALLET_LIMIT_REACHED: "payments:user-wallet.limit-reached",
    USER_WALLET_NOT_WHITELISTED: "payments:user-wallet.not-whitelisted",
    USER_WALLET_INVALID: "payments:user-wallet.invalid",
    PAYMENT_REJECTED_GENERIC_DECLINE: "payments:payment-rejected.generic-decline",
    PAYMENT_REJECTED_INSUFFICIENT_FUNDS: "payments:payment-rejected.insufficient-funds",
    PAYMENT_REJECTED_CARD_LOST: "payments:payment-rejected.card-lost",
    PAYMENT_REJECTED_CARD_STOLEN: "payments:payment-rejected.card-stolen",
    PAYMENT_REJECTED_CARD_EXPIRED: "payments:payment-rejected.card-expired",
    PAYMENT_REJECTED_CARD_INCORRECT_CVC: "payments:payment-rejected.card-incorrect-cvc",
    PAYMENT_REJECTED_PROCESSING_ERROR: "payments:payment-rejected.processing-error",
    PAYMENT_REJECTED_CARD_INCORRECT_NUMBER: "payments:payment-rejected.card-incorrect-number",
    TRANSACTION_ERROR_GENERIC: "payments:transaction-error.generic",
    CONTRACT_EXECUTION_REVERTED_GENERIC: "payments:contract-execution-reverted.generic",
    EMBEDDED_CHECKOUT_NOT_ENABLED: "payments:embedded-checkout.not-enabled",
} as const;
export type PaymentErrors = (typeof PaymentErrors)[keyof typeof PaymentErrors];

export const CrossmintErrors = {
    ...PaymentErrors,
};
export type CrossmintErrors = (typeof CrossmintErrors)[keyof typeof CrossmintErrors];
