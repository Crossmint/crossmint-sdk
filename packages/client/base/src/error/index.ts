import { CrossmintErrors } from "@/types";

export class CrossmintSDKError extends Error {
    constructor(
        message: string,
        public readonly code: CrossmintErrors,
        public readonly details?: string
    ) {
        super(message);
    }
}

export class CrossmintServiceError extends CrossmintSDKError {
    public status?: number;

    constructor(message: string, status?: number) {
        super(message, CrossmintErrors.CROSSMINT_SERVICE);
        this.status = status;
    }
}

export class NotAuthorizedError extends CrossmintSDKError {
    constructor(message: string) {
        super(message, CrossmintErrors.NOT_AUTHORIZED);
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

export class OutOfCreditsError extends CrossmintSDKError {
    constructor() {
        super(
            "You've run out of Crossmint API credits. Visit https://docs.crossmint.com/docs/errors for more information",
            CrossmintErrors.OUT_OF_CREDITS
        );
    }
}
