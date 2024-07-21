export const SmartWalletErrors = {
    NOT_AUTHORIZED: "smart-wallet:not-authorized",
    TRANSFER: "smart-wallet:transfer.error",
    TRANSACTION: "smart-wallet:transaction.error",
    CROSSMINT_SERVICE: "smart-wallet:crossmint-service.error",
    RUNNING_ON_SERVER: "smart-wallet:running-on-server",
    UNCATEGORIZED: "smart-wallet:uncategorized", // catch-all error code
} as const;
export type SmartWalletErrorCode = (typeof SmartWalletErrors)[keyof typeof SmartWalletErrors];

export class SmartWalletSDKError extends Error {
    public readonly code: SmartWalletErrorCode;

    constructor(message: string, code: SmartWalletErrorCode = SmartWalletErrors.UNCATEGORIZED) {
        super(message);
        this.code = code;
    }
}

export class NotAuthorizedError extends SmartWalletSDKError {
    constructor(message: string) {
        super(message, SmartWalletErrors.NOT_AUTHORIZED);
    }
}

export class TransferError extends SmartWalletSDKError {
    constructor(message: string) {
        super(message, SmartWalletErrors.TRANSFER);
    }
}

export class TransactionError extends SmartWalletSDKError {
    constructor(message: string) {
        super(message, SmartWalletErrors.TRANSACTION);
    }
}

export class CrossmintServiceError extends SmartWalletSDKError {
    public status?: number;

    constructor(message: string, status?: number) {
        super(message, SmartWalletErrors.CROSSMINT_SERVICE);
        this.status = status;
    }
}

export class RunningOnServerError extends SmartWalletSDKError {
    constructor() {
        super("Smart Wallet SDK should only be used client side.", SmartWalletErrors.RUNNING_ON_SERVER);
    }
}
