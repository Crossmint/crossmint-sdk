export const SmartWalletErrors = {
    NOT_AUTHORIZED: "smart-wallet:not-authorized",
    TRANSFER: "smart-wallet:transfer.error",
    TRANSACTION: "smart-wallet:transaction.error",
    CROSSMINT_SERVICE: "smart-wallet:crossmint-service.error",
    RUNNING_ON_SERVER: "smart-wallet:running-on-server",
    UNCATEGORIZED: "smart-wallet:uncategorized", // catch-all error code
    ERROR_JWT_EXPIRED: "smart-wallet:jwt-expired",
    ERROR_JWT_INVALID: "smart-wallet:jwt-invalid",
    ERROR_JWT_DECRYPTION: "smart-wallet:jwt-decryption",
    ERROR_JWT_IDENTIFIER: "smart-wallet:jwt-identifier",
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

export class JWTExpiredError extends NotAuthorizedError {
    public readonly code = SmartWalletErrors.ERROR_JWT_EXPIRED;

    /**
     * The expiry time of the JWT as an ISO 8601 timestamp.
     */
    public readonly expiredAt: string;

    constructor(expiredAt: Date) {
        super(`JWT provided expired at timestamp ${expiredAt}`);
        this.expiredAt = expiredAt.toISOString();
    }
}

export class JWTInvalidError extends NotAuthorizedError {
    public readonly code = SmartWalletErrors.ERROR_JWT_INVALID;
    constructor() {
        super("Invalid JWT provided");
    }
}

export class JWTDecryptionError extends NotAuthorizedError {
    public readonly code = SmartWalletErrors.ERROR_JWT_DECRYPTION;
    constructor() {
        super("Error decrypting JWT");
    }
}

export class JWTIdentifierError extends NotAuthorizedError {
    public readonly code = SmartWalletErrors.ERROR_JWT_IDENTIFIER;
    public readonly identifierKey: string;

    constructor(identifierKey: string) {
        super(`Missing required identifier '${identifierKey}' in the JWT`);
        this.identifierKey = identifierKey;
    }
}
