export const SmartWalletErrors = {
    TRANSFER: "smart-wallet:transfer.error",
    CROSSMINT_SERVICE: "smart-wallet:crossmint-service.error",
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

export class TransferError extends SmartWalletSDKError {
    constructor(message: string) {
        super(message, SmartWalletErrors.TRANSFER);
    }
}

export class CrossmintServiceError extends SmartWalletSDKError {
    public status?: number;

    constructor(message: string, status?: number) {
        super(message, SmartWalletErrors.CROSSMINT_SERVICE);
        this.status = status;
    }
}
