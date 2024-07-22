import { BaseError } from "viem";

import { SmartWalletSDKError } from ".";

export class ErrorMapper {
    public map(error: unknown, fallback: SmartWalletSDKError): SmartWalletSDKError | BaseError {
        if (error instanceof SmartWalletSDKError) {
            return error;
        }

        // Allow viem errors, which are generally pretty friendly.
        if (error instanceof BaseError) {
            return error;
        }

        return fallback;
    }
}
