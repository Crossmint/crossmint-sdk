import { PasskeyDisplay, SignerDisplay } from "../types/service";

import { CrossmintSDKError, SmartWalletErrorCode } from "@crossmint/client-sdk-base";

export class SmartWalletError extends CrossmintSDKError {
    constructor(message: string, details?: string, code: SmartWalletErrorCode = SmartWalletErrorCode.UNCATEGORIZED) {
        super(message, code, details);
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
