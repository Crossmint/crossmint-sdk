import { PasskeyDisplay, SignerDisplay } from "@/types/API";

export const SmartWalletErrorCode = {
    NOT_AUTHORIZED: "not-authorized",
    CROSSMINT_SERVICE: "crossmint-service",
    JWT_EXPIRED: "not-authorized.jwt-expired",
    JWT_INVALID: "not-authorized.jwt-invalid",
    JWT_DECRYPTION: "not-authorized.jwt-decryption",
    JWT_IDENTIFIER: "not-authorized.jwt-identifier",
    OUT_OF_CREDITS: "out-of-credits",
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

export class SmartWalletError extends Error {
    public readonly code: SmartWalletErrorCode;
    public readonly details?: string;

    constructor(message: string, details?: string, code: SmartWalletErrorCode = SmartWalletErrorCode.UNCATEGORIZED) {
        super(message);
        this.details = details;
        this.code = code;
    }
}

export class TransferError extends SmartWalletError {
    constructor(message: string) {
        super(message, undefined, SmartWalletErrorCode.TRANSFER);
    }
}

export class CrossmintServiceError extends SmartWalletError {
    public status?: number;

    constructor(message: string, status?: number) {
        super(message, undefined, SmartWalletErrorCode.CROSSMINT_SERVICE);
        this.status = status;
    }
}

export class AdminMismatchError extends SmartWalletError {
    public readonly required: SignerDisplay;
    public readonly used?: SignerDisplay;

    constructor(message: string, required: SignerDisplay, used?: SignerDisplay) {
        super(message, SmartWalletErrorCode.ADMIN_MISMATCH);
        this.required = required;
        this.used = used;
    }
}

export class PasskeyMismatchError extends SmartWalletError {
    public readonly required: PasskeyDisplay;
    public readonly used?: PasskeyDisplay;

    constructor(message: string, required: PasskeyDisplay, used?: PasskeyDisplay) {
        super(message, SmartWalletErrorCode.PASSKEY_MISMATCH);
        this.required = required;
        this.used = used;
    }
}

export class NotAuthorizedError extends SmartWalletError {
    constructor(message: string) {
        super(message, undefined, SmartWalletErrorCode.NOT_AUTHORIZED);
    }
}

export class JWTExpiredError extends NotAuthorizedError {
    public readonly code = SmartWalletErrorCode.JWT_EXPIRED;

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
    public readonly code = SmartWalletErrorCode.JWT_INVALID;
    constructor() {
        super("Invalid JWT provided");
    }
}

export class JWTDecryptionError extends NotAuthorizedError {
    public readonly code = SmartWalletErrorCode.JWT_DECRYPTION;
    constructor() {
        super("Error decrypting JWT");
    }
}

export class JWTIdentifierError extends NotAuthorizedError {
    public readonly code = SmartWalletErrorCode.JWT_IDENTIFIER;
    public readonly identifierKey: string;

    constructor(identifierKey: string) {
        super(`Missing required identifier '${identifierKey}' in the JWT`);
        this.identifierKey = identifierKey;
    }
}

export class UserWalletAlreadyCreatedError extends SmartWalletError {
    public readonly code = SmartWalletErrorCode.USER_WALLET_ALREADY_CREATED;

    constructor(userId: string) {
        super(`The user with userId ${userId.toString()} already has a wallet created for this project`);
    }
}

export class PasskeyPromptError extends SmartWalletError {
    public passkeyName: string;

    constructor(passkeyName: string) {
        super(
            `Prompt was either cancelled or timed out for passkey ${passkeyName}`,
            undefined,
            SmartWalletErrorCode.PASSKEY_PROMPT
        );
        this.passkeyName = passkeyName;
    }
}

export class PasskeyRegistrationError extends SmartWalletError {
    public passkeyName: string;

    constructor(passkeyName: string) {
        super(
            `Registration for passkey ${passkeyName} failed, either the registration took too long, or passkey signature vaildation failed.`,
            undefined,
            SmartWalletErrorCode.PASSKEY_REGISTRATION
        );
        this.passkeyName = passkeyName;
    }
}

export class PasskeyIncompatibleAuthenticatorError extends SmartWalletError {
    public passkeyName: string;

    constructor(passkeyName: string) {
        super(
            `User selected authenticator for passkey ${passkeyName} is not compatible with Crossmint's Smart Wallets.`,
            undefined,
            SmartWalletErrorCode.PASSKEY_INCOMPATIBLE_AUTHENTICATOR
        );
        this.passkeyName = passkeyName;
    }
}

export class OutOfCreditsError extends SmartWalletError {
    constructor(message?: string) {
        super(
            "You've run out of Crossmint API credits. Visit https://docs.crossmint.com/docs/errors for more information",
            undefined,
            SmartWalletErrorCode.OUT_OF_CREDITS
        );
    }
}

export class ConfigError extends SmartWalletError {
    constructor(message: string) {
        super(message, undefined, SmartWalletErrorCode.WALLET_CONFIG);
    }
}

export class AdminAlreadyUsedError extends ConfigError {
    public readonly code = SmartWalletErrorCode.ADMIN_SIGNER_ALREADY_USED;
    constructor() {
        super("This signer was already used to create another wallet. Please use a different signer.");
    }
}

export class SmartWalletsNotEnabledError extends ConfigError {
    public readonly code = SmartWalletErrorCode.SMART_WALLETS_NOT_ENABLED;
    constructor() {
        super(
            "Smart wallets are not enabled for this project. They can be enabled on the project settings page in the developer console."
        );
    }
}
