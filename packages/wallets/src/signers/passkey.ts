import { WebAuthnP256 } from "ox";
import { PasskeySignerConfig, Signer } from "./types";

export class PasskeySigner implements Signer {
    type = "passkey" as const;
    id: string;

    constructor(private config: PasskeySignerConfig) {
        this.id = config.id;
    }

    locator() {
        return `evm-passkey:${this.id}`;
    }

    async sign(message: string) {
        if (this.config.onSignWithPasskey) {
            return this.config.onSignWithPasskey(message);
        }
        const { metadata, signature } = await WebAuthnP256.sign({
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
}
