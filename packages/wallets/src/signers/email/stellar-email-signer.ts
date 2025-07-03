import { StrKey } from "@stellar/stellar-sdk";
import type { EmailInternalSignerConfig } from "../types";
import { EmailSignerApiClient } from "./email-signer-api-client";
import { EmailSigner, DEFAULT_EVENT_OPTIONS } from "./email-signer";
import type { Crossmint } from "@crossmint/common-sdk-base";

export class StellarEmailSigner extends EmailSigner {
    constructor(config: EmailInternalSignerConfig) {
        super(config);
    }

    locator() {
        return `stellar-keypair:${this.config.signerAddress}`;
    }

    async signMessage() {
        return await Promise.reject(new Error("signMessage method not implemented for stellar email signer"));
    }

    async signTransaction(transaction: string): Promise<{ signature: string }> {
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
                    bytes: transaction,
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
        StellarEmailSigner.verifyPublicKeyFormat(res.publicKey);
        return { signature: res.signature.bytes };
    }

    static async pregenerateSigner(email: string, crossmint: Crossmint): Promise<string> {
        const emailToUse = email ?? crossmint.experimental_customAuth?.email;
        if (emailToUse == null) {
            throw new Error("Email is required to pregenerate a signer");
        }

        try {
            const response = await new EmailSignerApiClient(crossmint).pregenerateSigner(emailToUse, "ed25519");
            const publicKey = response.publicKey;
            this.verifyPublicKeyFormat(publicKey);
            return this.publicKeyToStellarAddress(publicKey.bytes);
        } catch (error) {
            console.error("[StellarEmailSigner] Failed to pregenerate signer:", error);
            throw error;
        }
    }

    static verifyPublicKeyFormat(publicKey: { encoding: string; keyType: string; bytes: string } | null) {
        if (publicKey == null) {
            throw new Error("No public key found");
        }

        if (publicKey.keyType !== "ed25519" || publicKey.bytes == null) {
            throw new Error(
                "Not supported. Expected public key to be ed25519 key type. Got: " + JSON.stringify(publicKey)
            );
        }
    }

    private static publicKeyToStellarAddress(publicKeyBytes: string | number[]): string {
        let bytes: Uint8Array;

        if (Array.isArray(publicKeyBytes)) {
            bytes = new Uint8Array(publicKeyBytes);
        } else if (typeof publicKeyBytes === "string") {
            bytes = new Uint8Array(Buffer.from(publicKeyBytes, "base64"));
        } else {
            throw new Error("Unsupported public key format");
        }

        return StrKey.encodeEd25519PublicKey(Buffer.from(bytes));
    }
}
