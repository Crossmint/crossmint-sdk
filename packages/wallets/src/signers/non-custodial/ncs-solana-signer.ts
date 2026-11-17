import base58 from "bs58";
import type { EmailInternalSignerConfig, PhoneInternalSignerConfig } from "../types";
import { NonCustodialSigner } from "./ncs-signer";

export class SolanaNonCustodialSigner extends NonCustodialSigner {
    constructor(config: EmailInternalSignerConfig | PhoneInternalSignerConfig) {
        super(config);
    }

    /**
     * Produce a raw Ed25519 signature over an arbitrary payload.
     * @param message - The payload to sign, base58 encoded
     */
    async signMessage(message: string): Promise<{ signature: string }> {
        return await this.sign(base58.decode(message));
    }

    async signTransaction(message: string): Promise<{ signature: string }> {
        return await this.signMessage(message);
    }

    private async sign(messageData: Uint8Array): Promise<{ signature: string }> {
        await this.handleAuthRequired();
        const res = await this.requestSignature({
            keyType: "ed25519",
            bytes: base58.encode(new Uint8Array(messageData)),
            encoding: "base58",
            authId: this.getAuthId(),
        });

        if (res?.status === "error") {
            throw new Error(res.error);
        }

        if (res?.signature == null) {
            throw new Error("Failed to sign payload");
        }
        SolanaNonCustodialSigner.verifyPublicKeyFormat(res.publicKey);
        return { signature: res.signature.bytes };
    }

    static verifyPublicKeyFormat(publicKey: { encoding: string; keyType: string; bytes: string } | null) {
        if (publicKey == null) {
            throw new Error("No public key found");
        }

        if (publicKey.encoding !== "base58" || publicKey.keyType !== "ed25519" || publicKey.bytes == null) {
            throw new Error(
                "Not supported. Expected public key to be in base58 encoding and ed25519 key type. Got: " +
                    JSON.stringify(publicKey)
            );
        }
    }

    protected getChainKeyParams(): { scheme: "ed25519"; encoding: "base58" } {
        return {
            scheme: "ed25519",
            encoding: "base58",
        };
    }
}
