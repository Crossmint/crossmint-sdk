import { WebAuthnP256 } from "ox";
import type { PasskeyInternalSignerConfig, PasskeySignResult, PasskeySignerLocator, Signer } from "./types";

/**
 * Sign a message using a passkey credential.
 * @param credentialId The ID of the passkey credential
 * @param challenge The message/challenge to sign
 * @returns The signature and metadata
 */
export async function signWithPasskey(credentialId: string, challenge: string): Promise<PasskeySignResult> {
    const { signature, metadata } = await WebAuthnP256.sign({
        credentialId,
        challenge: challenge as `0x${string}`,
    });

    return {
        signature: {
            r: `0x${signature.r.toString(16)}`,
            s: `0x${signature.s.toString(16)}`,
        },
        metadata,
    };
}

export class PasskeySigner implements Signer {
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
            return await this.config.onSignWithPasskey(message);
        }
        return await signWithPasskey(this.id, message);
    }

    async signTransaction(transaction: string) {
        return await this.signMessage(transaction);
    }
}
