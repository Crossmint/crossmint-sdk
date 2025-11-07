import { WebAuthnP256 } from "ox";
import type { PasskeyInternalSignerConfig, PasskeySignResult, Signer } from "./types";

export class PasskeySigner implements Signer {
    type = "passkey" as const;
    id: string;

    constructor(private config: PasskeyInternalSignerConfig) {
        this.id = config.id;
    }

    locator() {
        return this.config.locator;
    }

    async signMessage(message: string): Promise<PasskeySignResult> {
        if (this.config.onSignWithPasskey) {
            return await this.config.onSignWithPasskey(message);
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
