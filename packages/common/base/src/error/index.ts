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

export class NotAuthorizedError extends CrossmintSDKError {
    constructor(message: string, details?: string) {
        super(message, CrossmintErrors.NOT_AUTHORIZED, details);
    }
}

export class JWTExpiredError extends NotAuthorizedError {
    public readonly code = CrossmintErrors.JWT_EXPIRED;

    /** The expiry time of the JWT as an ISO 8601 timestamp, when reported by the API. */
    public readonly expiredAt?: string;

    constructor(expiredAt?: string | Date, details?: string) {
        const expiredAtIso = expiredAt instanceof Date ? expiredAt.toISOString() : expiredAt;
        super(
            expiredAtIso != null ? `JWT provided expired at timestamp ${expiredAtIso}` : "JWT provided has expired",
            details
        );
        this.expiredAt = expiredAtIso;
    }
}

export class JWTInvalidError extends NotAuthorizedError {
    public readonly code = CrossmintErrors.JWT_INVALID;

    constructor(details?: string) {
        super("Invalid JWT provided", details);
    }
}

export class JWTDecryptionError extends NotAuthorizedError {
    public readonly code = CrossmintErrors.JWT_DECRYPTION;

    constructor(details?: string) {
        super("Error decrypting JWT", details);
    }
}

export class JWTIdentifierError extends NotAuthorizedError {
    public readonly code = CrossmintErrors.JWT_IDENTIFIER;
    public readonly identifierKey?: string;

    constructor(identifierKey?: string, details?: string) {
        super(
            identifierKey != null
                ? `Missing required identifier '${identifierKey}' in the JWT`
                : "Missing required identifier in the JWT",
            details
        );
        this.identifierKey = identifierKey;
    }
}
