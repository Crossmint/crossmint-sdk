import { PasskeyDisplay, SignerDisplay } from "@/types/API";

import { CrossmintErrors } from "@crossmint/client-sdk-base";

export class SmartWalletError extends Error {
    public readonly code: CrossmintErrors;
    public readonly details?: string;

    constructor(message: string, details?: string, code: CrossmintErrors = CrossmintErrors.UNCATEGORIZED) {
        super(message);
        this.details = details;
        this.code = code;
    }
}

export class TransferError extends SmartWalletError {
    constructor(message: string) {
        super(message, undefined, CrossmintErrors.TRANSFER);
    }
}

export class CrossmintServiceError extends SmartWalletError {
    public status?: number;

    constructor(message: string, status?: number) {
        super(message, undefined, CrossmintErrors.CROSSMINT_SERVICE);
        this.status = status;
    }
}

export class AdminMismatchError extends SmartWalletError {
    public readonly required: SignerDisplay;
    public readonly used?: SignerDisplay;

    constructor(message: string, required: SignerDisplay, used?: SignerDisplay) {
        super(message, CrossmintErrors.ADMIN_MISMATCH);
        this.required = required;
        this.used = used;
    }
}

export class PasskeyMismatchError extends SmartWalletError {
    public readonly required: PasskeyDisplay;
    public readonly used?: PasskeyDisplay;

    constructor(message: string, required: PasskeyDisplay, used?: PasskeyDisplay) {
        super(message, CrossmintErrors.PASSKEY_MISMATCH);
        this.required = required;
        this.used = used;
    }
}

export class NotAuthorizedError extends SmartWalletError {
    constructor(message: string) {
        super(message, undefined, CrossmintErrors.NOT_AUTHORIZED);
    }
}

export class JWTExpiredError extends NotAuthorizedError {
    public readonly code = CrossmintErrors.JWT_EXPIRED;

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
    public readonly code = CrossmintErrors.JWT_INVALID;
    constructor() {
        super("Invalid JWT provided");
    }
}

export class JWTDecryptionError extends NotAuthorizedError {
    public readonly code = CrossmintErrors.JWT_DECRYPTION;
    constructor() {
        super("Error decrypting JWT");
    }
}

export class JWTIdentifierError extends NotAuthorizedError {
    public readonly code = CrossmintErrors.JWT_IDENTIFIER;
    public readonly identifierKey: string;

    constructor(identifierKey: string) {
        super(`Missing required identifier '${identifierKey}' in the JWT`);
        this.identifierKey = identifierKey;
    }
}

export class UserWalletAlreadyCreatedError extends SmartWalletError {
    public readonly code = CrossmintErrors.USER_WALLET_ALREADY_CREATED;

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
            CrossmintErrors.PASSKEY_PROMPT
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
            CrossmintErrors.PASSKEY_REGISTRATION
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
            CrossmintErrors.PASSKEY_INCOMPATIBLE_AUTHENTICATOR
        );
        this.passkeyName = passkeyName;
    }
}

export class OutOfCreditsError extends SmartWalletError {
    constructor(message?: string) {
        super(
            "You've run out of Crossmint API credits. Visit https://docs.crossmint.com/docs/errors for more information",
            undefined,
            CrossmintErrors.OUT_OF_CREDITS
        );
    }
}

export class ConfigError extends SmartWalletError {
    constructor(message: string) {
        super(message, undefined, CrossmintErrors.WALLET_CONFIG);
    }
}

export class AdminAlreadyUsedError extends ConfigError {
    public readonly code = CrossmintErrors.ADMIN_SIGNER_ALREADY_USED;
    constructor() {
        super("This signer was already used to create another wallet. Please use a different signer.");
    }
}

export class NonCustodialWalletsNotEnabledError extends ConfigError {
    public readonly code = CrossmintErrors.SMART_WALLETS_NOT_ENABLED;
    constructor() {
        super("Non-custodial wallets are not enabled for this project");
    }
}
