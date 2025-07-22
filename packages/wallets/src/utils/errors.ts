import { CrossmintSDKError, WalletErrorCode } from "@crossmint/common-sdk-base";

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

export type WalletError =
    | InvalidApiKeyError
    | InvalidEnvironmentError
    | WalletTypeNotSupportedError
    | WalletNotAvailableError
    | InvalidWalletConfigError
    | WalletCreationError
    | WalletTypeMismatchError
    | SignerTypeMismatchError
    | InvalidSignerError
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
    | PendingApprovalsError;
