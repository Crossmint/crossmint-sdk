import { WebAuthnP256 } from "ox";
import type { PasskeyInternalSignerConfig, PasskeySignResult, Signer } from "./types";
import { EVMShadowSigner, type ShadowSignerStorage } from "./shadow-signer";

export class PasskeySigner implements Signer {
    type = "passkey" as const;
    id: string;
    protected shadowSigner?: EVMShadowSigner;
    protected shadowSignerStorage?: ShadowSignerStorage;

    constructor(
        private config: PasskeyInternalSignerConfig,
        walletAddress?: string,
        shadowSignerEnabled?: boolean,
        shadowSignerStorage?: ShadowSignerStorage
    ) {
        this.id = config.id;
        this.shadowSignerStorage = shadowSignerStorage;
        this.shadowSigner = new EVMShadowSigner(walletAddress, this.shadowSignerStorage, shadowSignerEnabled);
    }

    locator() {
        return this.config.locator;
    }

    async signMessage(message: string): Promise<PasskeySignResult> {
        if (this.shadowSigner?.hasShadowSigner()) {
            const result = await this.shadowSigner.signTransaction(message);
            // Convert the shadow signer result to PasskeySignResult format
            // Shadow signer returns { signature: string } where signature is "0x" + r + s
            const signatureHex = result.signature.replace("0x", "");
            const r = signatureHex.slice(0, 64);
            const s = signatureHex.slice(64, 128);
            return {
                signature: {
                    r: `0x${r}`,
                    s: `0x${s}`,
                },
                metadata: {} as any, // Shadow signer doesn't provide metadata
            };
        }
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
