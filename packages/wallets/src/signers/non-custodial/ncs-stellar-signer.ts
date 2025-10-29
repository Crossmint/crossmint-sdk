import type { EmailInternalSignerConfig, PhoneInternalSignerConfig } from "../types";
import { DEFAULT_EVENT_OPTIONS, NonCustodialSigner } from "./ncs-signer";
import { StellarShadowSigner } from "../shadow-signer";
import type { ShadowSignerStorage } from "@/signers/shadow-signer";

export class StellarNonCustodialSigner extends NonCustodialSigner {
    constructor(
        config: EmailInternalSignerConfig | PhoneInternalSignerConfig,
        walletAddress: string,
        shadowSignerStorage?: ShadowSignerStorage
    ) {
        super(config, shadowSignerStorage);
        this.shadowSigner = new StellarShadowSigner(
            walletAddress,
            this.shadowSignerStorage,
            this.config.shadowSigner?.enabled !== false
        );
    }

    async signMessage() {
        return await Promise.reject(new Error("signMessage method not implemented for stellar signer"));
    }

    async signTransaction(payload: string): Promise<{ signature: string }> {
        if (this.shadowSigner?.hasShadowSigner()) {
            return await this.shadowSigner.signTransaction(payload);
        }
        await this.handleAuthRequired();
        const jwt = this.getJwtOrThrow();

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
                    bytes: payload,
                    encoding: "base64",
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
}
