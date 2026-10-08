import {
    CrossmintSDKError,
    PaymentErrors,
    SmartWalletErrorCode,
    WalletErrorCode,
    CrossmintErrors,
} from "@crossmint/common-sdk-base";

export {
    NotAuthorizedError,
    JWTExpiredError,
    JWTInvalidError,
    JWTDecryptionError,
    JWTIdentifierError,
} from "@crossmint/common-sdk-base";

export class CrossmintServiceError extends CrossmintSDKError {
    public status?: number;

    constructor(message: string, status?: number) {
        super(message, CrossmintErrors.CROSSMINT_SERVICE);
        this.status = status;
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

export { CrossmintSDKError, PaymentErrors, SmartWalletErrorCode, WalletErrorCode, CrossmintErrors };
