import { CrossmintSDKError, SmartWalletErrorCode } from "@crossmint/client-sdk-base";

export class SmartWalletError extends CrossmintSDKError {
    constructor(message: string, details?: string, code: SmartWalletErrorCode = SmartWalletErrorCode.UNCATEGORIZED) {
        super(message, code, details);
    }
}

export class InvalidApiKeyError extends CrossmintSDKError {
    constructor(message: string, details?: string, code: SmartWalletErrorCode = SmartWalletErrorCode.UNCATEGORIZED) {
        super(message, code, details);
    }
}

export class WalletCreationError extends CrossmintSDKError {
    constructor(message: string, details?: string, code: SmartWalletErrorCode = SmartWalletErrorCode.UNCATEGORIZED) {
        super(message, code, details);
    }
}

export class InvalidChainError extends CrossmintSDKError {
    constructor(message: string, details?: string, code: SmartWalletErrorCode = SmartWalletErrorCode.UNCATEGORIZED) {
        super(message, code, details);
    }
}

export class InvalidTransferChainError extends CrossmintSDKError {
    constructor(message: string, details?: string, code: SmartWalletErrorCode = SmartWalletErrorCode.UNCATEGORIZED) {
        super(message, code, details);
    }
}

export class InvalidMessageFormatError extends CrossmintSDKError {
    constructor(message: string, details?: string, code: SmartWalletErrorCode = SmartWalletErrorCode.UNCATEGORIZED) {
        super(message, code, details);
    }
}

export class MessageSigningError extends CrossmintSDKError {
    constructor(message: string, details?: string, code: SmartWalletErrorCode = SmartWalletErrorCode.UNCATEGORIZED) {
        super(message, code, details);
    }
}

export class InvalidTypedDataError extends CrossmintSDKError {
    constructor(message: string, details?: string, code: SmartWalletErrorCode = SmartWalletErrorCode.UNCATEGORIZED) {
        super(message, code, details);
    }
}

export class TypedDataSigningError extends CrossmintSDKError {
    constructor(message: string, details?: string, code: SmartWalletErrorCode = SmartWalletErrorCode.UNCATEGORIZED) {
        super(message, code, details);
    }
}

export class TransactionApprovalError extends CrossmintSDKError {
    constructor(message: string, details?: string, code: SmartWalletErrorCode = SmartWalletErrorCode.UNCATEGORIZED) {
        super(message, code, details);
    }
}

export class TransactionFailedError extends CrossmintSDKError {
    constructor(message: string, details?: string, code: SmartWalletErrorCode = SmartWalletErrorCode.UNCATEGORIZED) {
        super(message, code, details);
    }
}

export class TransactionNotFoundError extends CrossmintSDKError {
    constructor(message: string, details?: string, code: SmartWalletErrorCode = SmartWalletErrorCode.UNCATEGORIZED) {
        super(message, code, details);
    }
}
