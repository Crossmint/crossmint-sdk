import { SmartWalletSDKError } from ".";

export class ErrorMapper {
    public map(error: unknown, fallback: SmartWalletSDKError): SmartWalletSDKError {
        if (error instanceof SmartWalletSDKError) {
            throw error;
        }

        // More error handling here.

        throw fallback;
    }
}
