import { DatadogProvider } from "@/services/logging/DatadogProvider";
import { SDK_VERSION } from "@/utils/constants";
import { BaseError, stringify } from "viem";

import { SmartWalletSDKError } from ".";

export class ErrorProcessor {
    constructor(private readonly logger: DatadogProvider) {}

    public map(error: unknown, fallback: SmartWalletSDKError): SmartWalletSDKError | BaseError {
        this.record(error);

        if (error instanceof SmartWalletSDKError) {
            return error;
        }

        // Allow viem errors, which are generally pretty friendly.
        if (error instanceof BaseError) {
            return error;
        }

        return fallback;
    }

    private record(error: unknown) {
        const message = error instanceof Error ? error.message : String(error);

        this.logger.logError(`Smart Wallet SDK Error: ${message}`, {
            stack: error instanceof Error ? error.stack : undefined,
            name: error instanceof Error ? error.name : "UnknownError",
            details: stringify(error),
            domain: window.location.hostname,
            sdk_version: SDK_VERSION,
        });
    }
}
