export const PaymentErrors = {
    MINT_CONFIG_INVALID: "payments:mint-config.invalid",
    PAYMENT_METHOD_INVALID: "payments:payment-method.invalid",
    CLIENT_ID_INVALID: "payments:client-id.invalid",
    REQUIRED_RECIPIENT: "payments:recipient.required",
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

    PAYMENT_AMOUNT_MISSING: "payments:payment-amount.missing",
    PAYMENT_SINGLE_PURCHASE_LIMIT_EXCEEDED: "payments:payment-single-purchase-limit.exceeded",
    PAYMENT_DAILY_TRANSACTION_LIMIT_EXCEEDED: "payments:payment-daily-transaction-limit.exceeded",
    TOKEN_DAILY_VOLUME_LIMIT_EXCEEDED: "payments:token-daily-volume-limit.exceeded",
    WALLET_ADDRESS_MISSING: "payments:wallet-address.missing",
    EMAIL_INVALID: "payments:email.invalid",
    PROJECT_ADDON_REQUIRED: "payments:project-addon.required",
    ASSET_NOT_AVAILABLE_IN_ENVIRONMENT: "payments:asset.not-available-in-environment",
    UNSUPPORTED_TOKEN: "payments:token.unsupported",
    PROJECT_FEATURE_NOT_ENABLED: "payments:project-feature.not-enabled",
} as const;
export type PaymentErrors = (typeof PaymentErrors)[keyof typeof PaymentErrors];

export const SmartWalletErrorCode = {
    TRANSFER: "smart-wallet:transfer",
    SMART_WALLETS_NOT_ENABLED: "smart-wallet:not-enabled",
    USER_WALLET_ALREADY_CREATED: "smart-wallet:user-wallet-already-created",
    WALLET_CONFIG: "smart-wallet:config",
    ADMIN_MISMATCH: "smart-wallet:config.admin-mismatch",
    PASSKEY_MISMATCH: "smart-wallet:config.passkey-mismatch",
    ADMIN_SIGNER_ALREADY_USED: "smart-wallet:config.admin-signer-already-used",
    PASSKEY_PROMPT: "smart-wallet:passkey.prompt",
    PASSKEY_INCOMPATIBLE_AUTHENTICATOR: "smart-wallet:passkey.incompatible-authenticator",
    PASSKEY_REGISTRATION: "smart-wallet:passkey.registration",
    UNCATEGORIZED: "smart-wallet:uncategorized", // smart wallet specific catch-all error code
} as const;
export type SmartWalletErrorCode = (typeof SmartWalletErrorCode)[keyof typeof SmartWalletErrorCode];

export const WalletErrorCode = {
    API_KEY_INVALID: "wallet:api-key-invalid",
    SIGNER_INVALID: "wallet:signer-invalid",
    WALLET_NOT_AVAILABLE: "wallet:wallet-not-available",
    WALLET_CREATION_FAILED: "wallet:wallet-creation-failed",
    WALLET_TYPE_INVALID: "wallet:wallet-type-invalid",
    MESSAGE_INVALID: "wallet:message-invalid",
    NO_SIGNATURE: "wallet:no-signature",
    SIGNING_FAILED: "wallet:signing-failed",
    NO_TRANSACTION: "wallet:no-transaction",
    TRANSACTION_FAILED: "wallet:transaction-failed",
    ENVIRONMENT_INVALID: "wallet:environment-invalid",
};
export type WalletErrorCode = (typeof WalletErrorCode)[keyof typeof WalletErrorCode];

export const CrossmintErrors = {
    ...PaymentErrors,
    ...SmartWalletErrorCode,
    ...WalletErrorCode,
    NOT_AUTHORIZED: "not-authorized",
    CROSSMINT_SERVICE: "crossmint-service",
    JWT_EXPIRED: "not-authorized.jwt-expired",
    JWT_INVALID: "not-authorized.jwt-invalid",
    JWT_DECRYPTION: "not-authorized.jwt-decryption",
    JWT_IDENTIFIER: "not-authorized.jwt-identifier",
    OUT_OF_CREDITS: "out-of-credits",
};

export type CrossmintErrors = (typeof CrossmintErrors)[keyof typeof CrossmintErrors];
