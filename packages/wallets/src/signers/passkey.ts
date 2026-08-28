import { Hex, WebAuthnP256 } from "ox";
import { SigningFailedError } from "../utils/errors";
import type { PasskeyInternalSignerConfig, PasskeySignResult, PasskeySignerLocator, SignerAdapter } from "./types";

const AUTHENTICATOR_DATA_MIN_BYTE_LENGTH = 37;
const AUTHENTICATOR_DATA_FLAGS_OFFSET = 32;
const AUTHENTICATOR_DATA_FLAG_USER_VERIFIED = 0x04;

/**
 * The on-chain WebAuthn verifier requires user verification, so an assertion whose UV flag is unset
 * is rejected by the bundler as an AA24 signature error. Some credential providers return UV-less
 * assertions (e.g. 1Password's iOS AutoFill path inside a webview) unless the assertion is
 * requested with `userVerification: "required"`.
 */
function isUserVerified(authenticatorData: Hex.Hex): boolean {
    const bytes = Hex.toBytes(authenticatorData);
    if (bytes.length < AUTHENTICATOR_DATA_MIN_BYTE_LENGTH) {
        return false;
    }
    return (bytes[AUTHENTICATOR_DATA_FLAGS_OFFSET] & AUTHENTICATOR_DATA_FLAG_USER_VERIFIED) !== 0;
}

export class PasskeySigner implements SignerAdapter {
    type = "passkey" as const;
    id: string;

    constructor(private config: PasskeyInternalSignerConfig) {
        this.id = config.id;
    }

    locator(): PasskeySignerLocator {
        return this.config.locator;
    }

    async signMessage(message: string): Promise<PasskeySignResult> {
        if (this.config.onSignWithPasskey) {
            const result = await this.config.onSignWithPasskey(message);
            if (!isUserVerified(result.metadata.authenticatorData)) {
                throw new SigningFailedError(
                    'The passkey assertion was created without user verification, and the on-chain verifier requires it. Request the assertion with `userVerification: "required"` so the authenticator prompts for biometrics or a PIN.'
                );
            }
            return result;
        }
        const { signature, metadata } = await WebAuthnP256.sign({
            credentialId: this.id,
            challenge: message as `0x${string}`,
        });

        return {
            signature: {
                r: `0x${signature.r.toString(16)}`,
                s: `0x${signature.s.toString(16)}`,
            },
            metadata,
        };
    }

    async signTransaction(transaction: string) {
        return await this.signMessage(transaction);
    }
}
