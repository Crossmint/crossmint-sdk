import base58 from "bs58";
import type { EmailInternalSignerConfig, PhoneInternalSignerConfig } from "../types";
import { DEFAULT_EVENT_OPTIONS, NonCustodialSigner } from "./ncs-signer";

export class StellarNonCustodialSigner extends NonCustodialSigner {
    constructor(config: EmailInternalSignerConfig | PhoneInternalSignerConfig) {
        super(config);
    }

    async signMessage() {
        return await Promise.reject(new Error("signMessage method not implemented for stellar signer"));
    }

    async signTransaction(transaction: string): Promise<{ signature: string }> {
        await this.handleAuthRequired();
        const jwt = this.getJwtOrThrow();

        const transactionBuffer = Buffer.from(transaction, "base64");
        const transactionBase58 = base58.encode(transactionBuffer);

        const res = await this.config.clientTEEConnection?.sendAction({
            event: "request:sign",
            responseEvent: "response:sign",
            data: {
                authData: {
                    jwt,
                    apiKey: this.config.crossmint.apiKey,
                },
                data: {
                    keyType: "ed25519",
                    bytes: transactionBase58,
                    encoding: "base58",
                },
            },
            options: DEFAULT_EVENT_OPTIONS,
        });

        if (res?.status === "error") {
            throw new Error(res.error);
        }

        if (res?.signature == null) {
            throw new Error("Failed to sign transaction");
        }
        StellarNonCustodialSigner.verifyPublicKeyFormat(res.publicKey);

        const signatureBuffer = base58.decode(res.signature.bytes);
        const signatureBase64 = Buffer.from(signatureBuffer).toString("base64");
        return { signature: signatureBase64 };
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
}
