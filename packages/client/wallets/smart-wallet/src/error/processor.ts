import { BaseError, stringify } from "viem";

import type { SDKLogger } from "@crossmint/client-sdk-base";

import { SmartWalletError } from ".";
import { SDK_VERSION } from "../utils/constants";

export class ErrorProcessor {
    constructor(private readonly logger: SDKLogger) {}

    public map(error: unknown, fallback: SmartWalletError): SmartWalletError | BaseError {
        this.record(error);

        if (error instanceof SmartWalletError) {
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
        this.logger.error(`Smart Wallet SDK Error: ${message}`, {
            stack: error instanceof Error ? error.stack : undefined,
            name: error instanceof Error ? error.name : "UnknownError",
            details: stringify(error),
            domain: window.location.hostname,
            sdk_version: SDK_VERSION,
        });
    }
}
