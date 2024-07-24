export const SmartWalletErrors = {
    TRANSFER: "smart-wallet:transfer.error",
    CROSSMINT_SERVICE: "smart-wallet:crossmint-service.error",
    UNCATEGORIZED: "smart-wallet:uncategorized", // catch-all error code
} as const;
export type SmartWalletErrorCode = (typeof SmartWalletErrors)[keyof typeof SmartWalletErrors];

export class SmartWalletSDKError extends Error {
    public readonly code: SmartWalletErrorCode;
    public readonly details?: string;

    constructor(message: string, details?: string, code: SmartWalletErrorCode = SmartWalletErrors.UNCATEGORIZED) {
        super(message);
        this.details = details;
        this.code = code;
    }
}

export class TransferError extends SmartWalletSDKError {
    constructor(message: string) {
        super(message, undefined, SmartWalletErrors.TRANSFER);
    }
}

export class CrossmintServiceError extends SmartWalletSDKError {
    public status?: number;

    constructor(message: string, status?: number) {
        super(message, undefined, SmartWalletErrors.CROSSMINT_SERVICE);
        this.status = status;
    }
}
