import type { EmailInternalSignerConfig, PhoneInternalSignerConfig } from "../types";
import { DEFAULT_EVENT_OPTIONS, NonCustodialSigner } from "./ncs-signer";
import { walletsLogger } from "../../logger";
import { encodeStellarPublicKey } from "../../utils/stellar";
import { decodeBase64 } from "@crossmint/client-signers-cryptography";

export class StellarNonCustodialSigner extends NonCustodialSigner {
    constructor(config: EmailInternalSignerConfig | PhoneInternalSignerConfig) {
        super(config);
    }

    async signMessage() {
        return await Promise.reject(new Error("signMessage method not implemented for stellar signer"));
    }

    async signTransaction(payload: string): Promise<{ signature: string }> {
        await this.handleAuthRequired();
        const jwt = this.getJwtOrThrow();

        walletsLogger.info("sign: sending request", { keyType: "ed25519" });
        const startTime = Date.now();
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
                    authId: this.getAuthId(),
                },
            },
            options: DEFAULT_EVENT_OPTIONS,
        });
        walletsLogger.info("sign: response received", {
            status: res?.status,
            durationMs: Date.now() - startTime,
        });

        if (res?.status === "error") {
            throw new Error(res.error);
        }

        if (res?.signature == null) {
            throw new Error("Failed to sign transaction");
        }
        StellarNonCustodialSigner.verifyPublicKeyFormat(res.publicKey);
        this.assertPublicKeyBelongsToRecoveryMethod(res.publicKey);
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

    protected addressFromPublicKey(publicKey: { bytes: string; encoding: string; keyType: string }): string | null {
        if (publicKey.keyType !== "ed25519" || publicKey.encoding !== "base64") {
            return null;
        }
        return encodeStellarPublicKey(decodeBase64(publicKey.bytes));
    }

    protected getChainKeyParams(): { scheme: "ed25519"; encoding: "strkey" } {
        return {
            scheme: "ed25519",
            encoding: "strkey",
        };
    }
}
