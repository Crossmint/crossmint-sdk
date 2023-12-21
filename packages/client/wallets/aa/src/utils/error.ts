import { logError } from "@/services/logging";

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

export class PassphraseRequiredError extends Error {
    code = "ERROR_PASSPHRASE_REQUIRED";

    constructor(message: string) {
        super(message);

        // ES5 workaround
        Object.setPrototypeOf(this, PassphraseRequiredError.prototype);
    }
}

export class KeysGenerationError extends Error {
    code = "ERROR_KEYS_GENERATION";

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

export class CrossmintServiceError extends Error {
    code = "ERROR_CROSSMINT_SERVICE";

    constructor(message: string) {
        super(message);

        // ES5 workaround
        Object.setPrototypeOf(this, WalletSdkError.prototype);
    }
}

/**
 * Generic undefined error
 */
export class NonCustodialWalletError extends Error {
    code = "ERROR_UNDEFINED";

    constructor(message: string) {
        super(message);

        // ES5 workaround
        Object.setPrototypeOf(this, WalletSdkError.prototype);
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


export function errorToJSON(error: Error | unknown) {
    const errorToLog = error instanceof Error ? error : { message: "Unknown error", name: "Unknown error" };

    if (!(errorToLog instanceof Error) && (errorToLog as any).constructor?.name !== "SyntheticBaseEvent") {
        logError("ERROR_TO_JSON_FAILED", { error: errorToLog });
        throw new Error("[errorToJSON] err is not instanceof Error nor SyntheticBaseEvent");
    }

    return JSON.parse(JSON.stringify(errorToLog, Object.getOwnPropertyNames(errorToLog)));
}
