import { StrKey } from "@stellar/stellar-sdk";
import base58 from "bs58";
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

        const transactionBytes = base58.decode(transaction);
        const messageData = transactionBytes;

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
                    bytes: base58.encode(messageData),
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
            
            const publicKeyBytes = base58.decode(publicKey.bytes);
            const stellarAddress = StrKey.encodeEd25519PublicKey(Buffer.from(publicKeyBytes));
            return stellarAddress;
        } catch (error) {
            console.error("[StellarEmailSigner] Failed to pregenerate signer:", error);
            throw error;
        }
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

    static decodeStellarAddress(stellarAddress: string): Uint8Array {
        try {
            return StrKey.decodeEd25519PublicKey(stellarAddress);
        } catch (error) {
            throw new Error(`Invalid Stellar address format: ${stellarAddress}`);
        }
    }
}
