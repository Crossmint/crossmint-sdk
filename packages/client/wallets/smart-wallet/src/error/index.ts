import { PasskeyDisplay, SignerDisplay } from "@/types/API";

export const SmartWalletErrors = {
    NOT_AUTHORIZED: "smart-wallet:not-authorized",
    TRANSFER: "smart-wallet:transfer.error",
    CROSSMINT_SERVICE: "smart-wallet:crossmint-service.error",
    ERROR_JWT_EXPIRED: "smart-wallet:not-authorized.jwt-expired",
    ERROR_JWT_INVALID: "smart-wallet:not-authorized.jwt-invalid",
    ERROR_JWT_DECRYPTION: "smart-wallet:not-authorized.jwt-decryption",
    ERROR_JWT_IDENTIFIER: "smart-wallet:not-authorized.jwt-identifier",
    ERROR_USER_WALLET_ALREADY_CREATED: "smart-wallet:user-wallet-already-created.error",
    ERROR_OUT_OF_CREDITS: "smart-wallet:out-of-credits.error",
    ERROR_WALLET_CONFIG: "smart-wallet:wallet-config.error",
    ERROR_ADMIN_MISMATCH: "smart-wallet:wallet-config.admin-mismatch",
    ERROR_PASSKEY_MISMATCH: "smart-wallet:wallet-config.passkey-mismatch",
    ERROR_PASSKEY_PROMPT: "smart-wallet:passkey.prompt",
    ERROR_ADMIN_SIGNER_ALREADY_USED: "smart-wallet:wallet-config.admin-signer-already-used",
    ERROR_PROJECT_NONCUSTODIAL_WALLETS_NOT_ENABLED: "smart-wallet:wallet-config.non-custodial-wallets-not-enabled",
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

export class AdminMismatchError extends SmartWalletSDKError {
    public readonly required: SignerDisplay;
    public readonly used?: SignerDisplay;

    constructor(message: string, required: SignerDisplay, used?: SignerDisplay) {
        super(message, SmartWalletErrors.ERROR_ADMIN_MISMATCH);
        this.required = required;
        this.used = used;
    }
}

export class PasskeyMismatchError extends SmartWalletSDKError {
    public readonly required: PasskeyDisplay;
    public readonly used?: PasskeyDisplay;

    constructor(message: string, required: PasskeyDisplay, used?: PasskeyDisplay) {
        super(message, SmartWalletErrors.ERROR_PASSKEY_MISMATCH);
        this.required = required;
        this.used = used;
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

export class UserWalletAlreadyCreatedError extends SmartWalletSDKError {
    public readonly code = SmartWalletErrors.ERROR_USER_WALLET_ALREADY_CREATED;

    constructor(userId: string) {
        super(`The user with userId ${userId.toString()} already has a wallet created for this project`);
    }
}

export class PasskeyPromptError extends SmartWalletSDKError {
    public passkeyName: string;

    constructor(passkeyName: string) {
        super("Passkey prompt was either cancelled or timed out", SmartWalletErrors.ERROR_PASSKEY_PROMPT);
        this.passkeyName = passkeyName;
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

export class NonCustodialWalletsNotEnabledError extends ConfigError {
    public readonly code = SmartWalletErrors.ERROR_PROJECT_NONCUSTODIAL_WALLETS_NOT_ENABLED;
    constructor() {
        super("Non-custodial wallets are not enabled for this project");
    }
}
