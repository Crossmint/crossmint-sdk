export const SmartWalletErrors = {
    NOT_AUTHORIZED: "smart-wallet:not-authorized",
    TRANSFER: "smart-wallet:transfer.error",
    CROSSMINT_SERVICE: "smart-wallet:crossmint-service.error",
    ERROR_JWT_EXPIRED: "smart-wallet:not-authorized.jwt-expired",
    ERROR_JWT_INVALID: "smart-wallet:not-authorized.jwt-invalid",
    ERROR_JWT_DECRYPTION: "smart-wallet:not-authorized.jwt-decryption",
    ERROR_JWT_IDENTIFIER: "smart-wallet:not-authorized.jwt-identifier",
    ERROR_OUT_OF_CREDITS: "smart-wallet:out-of-credits.error",
    ERROR_WALLET_CONFIG: "smart-wallet:wallet-config.error",
    ERROR_ADMIN_SIGNER_ALREADY_USED: "smart-wallet:wallet-config.admin-signer-already-used",
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

export class NotAuthorizedError extends SmartWalletSDKError {
    constructor(message: string) {
        super(message, undefined, SmartWalletErrors.NOT_AUTHORIZED);
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

export class OutOfCreditsError extends SmartWalletSDKError {
    constructor(message?: string) {
        super(
            "You've run out of Crossmint API credits. Visit https://docs.crossmint.com/docs/errors for more information",
            undefined,
            SmartWalletErrors.ERROR_OUT_OF_CREDITS
        );
    }
}

export class ConfigError extends SmartWalletSDKError {
    constructor(message: string) {
        super(message, undefined, SmartWalletErrors.ERROR_WALLET_CONFIG);
    }
}

export class AdminAlreadyUsedError extends ConfigError {
    public readonly code = SmartWalletErrors.ERROR_ADMIN_SIGNER_ALREADY_USED;
    constructor() {
        super("This signer was already used to create another wallet. Please use a different signer.");
    }
}
