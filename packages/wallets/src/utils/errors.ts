import {
    CrossmintSDKError,
    JWTDecryptionError,
    JWTExpiredError,
    JWTIdentifierError,
    JWTInvalidError,
    NotAuthorizedError,
    WalletErrorCode,
} from "@crossmint/common-sdk-base";

export {
    NotAuthorizedError,
    JWTExpiredError,
    JWTInvalidError,
    JWTDecryptionError,
    JWTIdentifierError,
} from "@crossmint/common-sdk-base";

export class InvalidApiKeyError extends CrossmintSDKError {
    constructor(message: string, details?: string) {
        super(message, WalletErrorCode.API_KEY_INVALID, details);
    }
}

export class InvalidEnvironmentError extends CrossmintSDKError {
    constructor(message: string, details?: string) {
        super(message, WalletErrorCode.ENVIRONMENT_INVALID, details);
    }
}

export class InvalidChainError extends CrossmintSDKError {
    constructor(message: string, details?: string) {
        super(message, WalletErrorCode.WALLET_CREATION_FAILED, details);
    }
}

export class WalletTypeNotSupportedError extends CrossmintSDKError {
    constructor(message: string, details?: string) {
        super(message, WalletErrorCode.WALLET_TYPE_INVALID, details);
    }
}

export class WalletNotAvailableError extends CrossmintSDKError {
    constructor(message: string, details?: string) {
        super(message, WalletErrorCode.WALLET_NOT_AVAILABLE, details);
    }
}

export class InvalidWalletConfigError extends CrossmintSDKError {
    constructor(message: string, details?: string) {
        super(message, WalletErrorCode.WALLET_NOT_AVAILABLE, details);
    }
}

export class WalletCreationError extends CrossmintSDKError {
    constructor(message: string, details?: string) {
        super(message, WalletErrorCode.WALLET_CREATION_FAILED, details);
    }
}

export class WalletTypeMismatchError extends CrossmintSDKError {
    constructor(message: string, details?: string) {
        super(message, WalletErrorCode.WALLET_TYPE_INVALID, details);
    }
}

export class SignerTypeMismatchError extends CrossmintSDKError {
    constructor(message: string, details?: string) {
        super(message, WalletErrorCode.SIGNER_INVALID, details);
    }
}

export class InvalidSignerError extends CrossmintSDKError {
    constructor(message: string, details?: string) {
        super(message, WalletErrorCode.SIGNER_INVALID, details);
    }
}

export class UnknownSignerTypeError extends CrossmintSDKError {
    constructor(message: string, details?: string) {
        super(message, WalletErrorCode.SIGNER_INVALID, details);
    }
}

/**
 * Stable error code returned by the wallets API when a Solana smart wallet's underlying
 * provider does not support device signers. The SDK catches this code in `recover()` and
 * transparently falls back to the recovery signer so seamless provider-aware defaults work
 * without exposing the provider name on the API response. Must match the backend constant
 * `DEVICE_SIGNER_NOT_SUPPORTED_ERROR_CODE`.
 */
export const DEVICE_SIGNER_NOT_SUPPORTED_ERROR_CODE = "DEVICE_SIGNER_NOT_SUPPORTED";

export class DeviceSignerNotSupportedError extends CrossmintSDKError {
    constructor(message: string, details?: string) {
        super(message, WalletErrorCode.SIGNER_INVALID, details);
    }
}

/**
 * Thrown when the browser does not support third-party storage partitioning,
 * making it unsafe to store device-signer keys in IndexedDB. Consumers should
 * either prompt the user to upgrade their browser or fall back to a non-device
 * signer (e.g. recovery signer).
 */
export class UnsupportedBrowserError extends CrossmintSDKError {
    constructor(message: string, details?: string) {
        super(message, WalletErrorCode.ENVIRONMENT_INVALID, details);
    }
}

export class InvalidMessageFormatError extends CrossmintSDKError {
    constructor(message: string, details?: string) {
        super(message, WalletErrorCode.MESSAGE_INVALID, details);
    }
}

export class InvalidTypedDataError extends CrossmintSDKError {
    constructor(message: string, details?: string) {
        super(message, WalletErrorCode.MESSAGE_INVALID, details);
    }
}

export class SignatureNotFoundError extends CrossmintSDKError {
    constructor(message: string, details?: string) {
        super(message, WalletErrorCode.SIGNING_FAILED, details);
    }
}

export class SigningFailedError extends CrossmintSDKError {
    constructor(message: string, details?: string) {
        super(message, WalletErrorCode.SIGNING_FAILED, details);
    }
}

export class MessageSigningNotSupportedError extends CrossmintSDKError {
    constructor(message: string, details?: string) {
        super(message, WalletErrorCode.SIGNING_FAILED, details);
    }
}

export class SignatureNotCreatedError extends CrossmintSDKError {
    constructor(message: string, details?: string) {
        super(message, WalletErrorCode.NO_SIGNATURE, details);
    }
}

export class SignatureNotAvailableError extends CrossmintSDKError {
    constructor(message: string, details?: string) {
        super(message, WalletErrorCode.NO_SIGNATURE, details);
    }
}

export class SignatureFailedError extends CrossmintSDKError {
    constructor(message: string, details?: string) {
        super(message, WalletErrorCode.SIGNING_FAILED, details);
    }
}

export class SignatureConfirmationTimeoutError extends CrossmintSDKError {
    constructor(message: string, details?: string) {
        super(message, WalletErrorCode.SIGNING_FAILED, details);
    }
}

export class InvalidTransferAmountError extends CrossmintSDKError {
    constructor(message: string, details?: string) {
        super(message, WalletErrorCode.NO_TRANSACTION, details);
    }
}

export class TransactionNotCreatedError extends CrossmintSDKError {
    constructor(message: string, details?: string) {
        super(message, WalletErrorCode.NO_TRANSACTION, details);
    }
}

export class TransactionNotAvailableError extends CrossmintSDKError {
    constructor(message: string, details?: string) {
        super(message, WalletErrorCode.NO_TRANSACTION, details);
    }
}

export class TransactionConfirmationTimeoutError extends CrossmintSDKError {
    constructor(message: string, details?: string) {
        super(message, WalletErrorCode.TRANSACTION_FAILED, details);
    }
}

export class TransactionSendingFailedError extends CrossmintSDKError {
    constructor(message: string, details?: string) {
        super(message, WalletErrorCode.TRANSACTION_FAILED, details);
    }
}

export class TransactionAwaitingApprovalError extends CrossmintSDKError {
    constructor(message: string, details?: string) {
        super(message, WalletErrorCode.TRANSACTION_FAILED, details);
    }
}

export class TransactionHashNotFoundError extends CrossmintSDKError {
    constructor(message: string, details?: string) {
        super(message, WalletErrorCode.TRANSACTION_FAILED, details);
    }
}

export class TransactionFailedError extends CrossmintSDKError {
    constructor(message: string, details?: string) {
        super(message, WalletErrorCode.TRANSACTION_FAILED, details);
    }
}

export class PendingApprovalsError extends CrossmintSDKError {
    constructor(message: string, details?: string) {
        super(message, WalletErrorCode.TRANSACTION_FAILED, details);
    }
}

export class InvalidAddressError extends CrossmintSDKError {
    constructor(message: string, details?: string) {
        super(message, WalletErrorCode.RECIPIENT_ADDRESS_INVALID, details);
    }
}

/**
 * Shape of the structured error body returned by the Crossmint wallets API. `code` carries a
 * stable identifier for the failure and, for auth failures, extra fields (e.g. `expiredAt`) are
 * spread onto the top level of the response by the backend exception filter.
 */
type CrossmintApiErrorBody = {
    error?: boolean;
    message?: string;
    code?: string;
    expiredAt?: string;
    identifierKey?: string;
};

function isCrossmintApiErrorBody(response: unknown): response is CrossmintApiErrorBody {
    return typeof response === "object" && response != null;
}

/**
 * Inspects a Crossmint wallets API error response and, when it carries a recognized auth error
 * code, throws the corresponding typed error so callers surface the real failure (e.g. an expired
 * JWT) instead of masking it behind a generic wallet error. Returns without throwing when the
 * response is not a recognized auth error, letting callers throw their own contextual error.
 */
export function throwIfCrossmintApiAuthError(response: unknown): void {
    if (!isCrossmintApiErrorBody(response) || response.code == null) {
        return;
    }

    const details = JSON.stringify(response);
    switch (response.code) {
        case "ERROR_JWT_EXPIRED":
            throw new JWTExpiredError(response.expiredAt, details);
        case "ERROR_JWT_INVALID":
            throw new JWTInvalidError(details);
        case "ERROR_JWT_DECRYPTION":
            throw new JWTDecryptionError(details);
        case "ERROR_JWT_IDENTIFIER_ERROR":
            throw new JWTIdentifierError(response.identifierKey, details);
        case "ERROR_JWT_AUDIENCE_MISMATCH":
            throw new NotAuthorizedError(response.message ?? "JWT audience mismatch", details);
    }
}

export type WalletError =
    | InvalidTransferAmountError
    | InvalidApiKeyError
    | InvalidEnvironmentError
    | InvalidChainError
    | WalletTypeNotSupportedError
    | WalletNotAvailableError
    | InvalidWalletConfigError
    | WalletCreationError
    | WalletTypeMismatchError
    | SignerTypeMismatchError
    | InvalidSignerError
    | UnknownSignerTypeError
    | DeviceSignerNotSupportedError
    | InvalidMessageFormatError
    | InvalidTypedDataError
    | SignatureNotFoundError
    | SigningFailedError
    | MessageSigningNotSupportedError
    | SignatureNotCreatedError
    | SignatureNotAvailableError
    | SignatureFailedError
    | TransactionNotCreatedError
    | TransactionNotAvailableError
    | TransactionConfirmationTimeoutError
    | TransactionSendingFailedError
    | TransactionAwaitingApprovalError
    | TransactionHashNotFoundError
    | TransactionFailedError
    | PendingApprovalsError
    | InvalidAddressError
    | UnsupportedBrowserError
    | NotAuthorizedError
    | JWTExpiredError
    | JWTInvalidError
    | JWTDecryptionError
    | JWTIdentifierError;
