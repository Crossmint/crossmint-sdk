import { logError } from "@/services/logging";
import { BaseError, stringify } from "viem";

import { SmartWalletSDKError } from ".";

export class ErrorBoundary {
    public map(error: unknown, fallback: SmartWalletSDKError): SmartWalletSDKError | BaseError {
        logError(stringify(error));

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
