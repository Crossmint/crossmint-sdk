import { SignerData } from "@/types/API";
import { WebAuthnError } from "@simplewebauthn/browser";

import { PasskeyPromptError, SmartWalletSDKError } from ".";

export class ErrorMapper {
    constructor(private readonly signerData: SignerData) {}

    public map(error: unknown, fallback: SmartWalletSDKError): SmartWalletSDKError {
        if (error instanceof SmartWalletSDKError) {
            throw error;
        }

        if (this.signerData.type === "passkeys") {
            if ((error as WebAuthnError).name === "NotAllowedError") {
                throw new PasskeyPromptError(this.signerData.passkeyName);
            }
        }

        throw fallback;
    }
}
