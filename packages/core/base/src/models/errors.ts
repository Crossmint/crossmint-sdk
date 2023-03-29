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
} as const;
export type PaymentErrors = (typeof PaymentErrors)[keyof typeof PaymentErrors];

export const CrossmintErrors = {
    ...PaymentErrors,
};
export type CrossmintErrors = (typeof CrossmintErrors)[keyof typeof CrossmintErrors];
