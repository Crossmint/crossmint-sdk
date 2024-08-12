import { PasskeyDisplay, SignerDisplay } from "@/types/API";

import { CrossmintErrors, CrossmintSDKError, SmartWalletErrorCode } from "@crossmint/client-sdk-base";

export { SmartWalletErrorCode };

export class SmartWalletError extends CrossmintSDKError {
    constructor(message: string, details?: string, code: CrossmintErrors = CrossmintErrors.UNCATEGORIZED) {
        super(message, code, details);
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

export class OutOfCreditsError extends CrossmintSDKError {
    constructor() {
        super(
            "You've run out of Crossmint API credits. Visit https://docs.crossmint.com/docs/errors for more information",
            CrossmintErrors.OUT_OF_CREDITS
        );
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
