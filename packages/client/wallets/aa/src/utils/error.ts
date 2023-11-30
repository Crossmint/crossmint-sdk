/**
 * Need to learn when to use it
 */
export class NotAuthorizedError extends Error {
    code = "ERROR_NOT_AUTHORIZED";

    constructor(message: string) {
        super(message);

        // ES5 workaround
        Object.setPrototypeOf(this, NotAuthorizedError.prototype);
    }
}

/**
 * Need to learn when to use it
 */
export class RateLimitError extends Error {
    code = "ERROR_RATE_LIMIT";
    retryAfterMs: number;

    constructor(message: string, retryAfterMs: number) {
        super(message);

        this.retryAfterMs = retryAfterMs;

        // ES5 workaround
        Object.setPrototypeOf(this, RateLimitError.prototype);
    }
}

/**
 * Need to learn when to use it
 */
export class PassphraseRequiredError extends Error {
    code = "ERROR_PASSPHRASE_REQUIRED";

    constructor(message: string) {
        super(message);

        // ES5 workaround
        Object.setPrototypeOf(this, PassphraseRequiredError.prototype);
    }
}

export class BackupKeysGenerationError extends Error {
    code = "ERROR_BACKUP_KEYS_GENERATION";

    constructor(message: string) {
        super(message);

        // ES5 workaround
        Object.setPrototypeOf(this, PassphraseRequiredError.prototype);
    }
}

export class SignTransactionError extends Error {
    code = "ERROR_SIGN_TRANSACTION";

    constructor(message: string) {
        super(message);

        // ES5 workaround
        Object.setPrototypeOf(this, PassphraseRequiredError.prototype);
    }
}

export class TransferError extends Error {
    code = "ERROR_TRANSFER";

    constructor(message: string) {
        super(message);

        // ES5 workaround
        Object.setPrototypeOf(this, PassphraseRequiredError.prototype);
    }
}

/**
 * Generic undefined error
 */
export class WalletSdkError extends Error {
    code = "ERROR_UNDEFINED";

    constructor(message: string) {
        super(message);

        // ES5 workaround
        Object.setPrototypeOf(this, WalletSdkError.prototype);
    }
}
