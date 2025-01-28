import { CrossmintSDKError, SmartWalletErrorCode } from "@crossmint/client-sdk-base";

export class SmartWalletError extends CrossmintSDKError {
    constructor(message: string, details?: string, code: SmartWalletErrorCode = SmartWalletErrorCode.UNCATEGORIZED) {
        super(message, code, details);
    }
}
