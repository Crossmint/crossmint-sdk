import { logError } from "@/services/logging";

export class NotAuthorizedError extends Error {
    code = "ERROR_NOT_AUTHORIZED";

    constructor(message: string) {
        super(message);
        Object.setPrototypeOf(this, NotAuthorizedError.prototype);
    }
}

export class TransferError extends Error {
    code = "ERROR_TRANSFER";

    constructor(message: string) {
        super(message);
        Object.setPrototypeOf(this, TransferError.prototype);
    }
}

export class TransactionError extends Error {
    code = "ERROR_TRANSACTION";

    constructor(message: string) {
        super(message);
        Object.setPrototypeOf(this, TransactionError.prototype);
    }
}

export class CrossmintServiceError extends Error {
    public code = "ERROR_CROSSMINT_SERVICE";
    public status?: number;

    constructor(message: string, status?: number) {
        super(message);
        this.status = status;
        Object.setPrototypeOf(this, CrossmintServiceError.prototype);
    }
}

export class RunningOnServerError extends Error {
    public readonly code = "ERROR_RUNNING_ON_SERVER";

    constructor() {
        super("Smart Wallet SDK should only be used client side.");
    }
}

/**
 * Generic undefined error
 */
export class WalletSdkError extends Error {
    code = "ERROR_UNDEFINED";

    constructor(message: string) {
        super(message);
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
