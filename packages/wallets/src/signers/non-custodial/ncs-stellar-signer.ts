import type { EmailInternalSignerConfig, PhoneInternalSignerConfig } from "../types";
import { NonCustodialSigner } from "./ncs-signer";

export class StellarNonCustodialSigner extends NonCustodialSigner {
    constructor(config: EmailInternalSignerConfig | PhoneInternalSignerConfig) {
        super(config);
    }

    async signMessage() {
        return await Promise.reject(new Error("signMessage method not implemented for stellar signer"));
    }

    async signTransaction(payload: string): Promise<{ signature: string }> {
        await this.handleAuthRequired();
        const res = await this.requestSignature({
            keyType: "ed25519",
            bytes: payload,
            encoding: "base64",
            authId: this.getAuthId(),
        });

        if (res?.status === "error") {
            throw new Error(res.error);
        }

        if (res?.signature == null) {
            throw new Error("Failed to sign transaction");
        }
        StellarNonCustodialSigner.verifyPublicKeyFormat(res.publicKey);
        if (res.signature.encoding !== "base64") {
            throw new Error("Wrong encoding for signature. Expected base64, got " + res.signature.encoding);
        }

        return { signature: res.signature.bytes };
    }

    static verifyPublicKeyFormat(publicKey: { encoding: string; keyType: string; bytes: string } | null) {
        if (publicKey == null) {
            throw new Error("No public key found");
        }

        if (publicKey.encoding !== "base64" || publicKey.keyType !== "ed25519" || publicKey.bytes == null) {
            throw new Error(
                "Not supported. Expected public key to be in base64 encoding and ed25519 key type. Got: " +
                    JSON.stringify(publicKey)
            );
        }
    }

    protected getChainKeyParams(): { scheme: "ed25519"; encoding: "strkey" } {
        return {
            scheme: "ed25519",
            encoding: "strkey",
        };
    }
}
