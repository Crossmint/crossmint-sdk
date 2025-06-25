import { VersionedTransaction } from "@solana/web3.js";
import base58 from "bs58";
import type { EmailInternalSignerConfig } from "../types";
import { EmailSignerApiClient } from "./email-signer-api-client";
import { EmailSigner, DEFAULT_EVENT_OPTIONS } from "./email-signer";
import type { Crossmint } from "@crossmint/common-sdk-base";

export class SolanaEmailSigner extends EmailSigner {
    constructor(config: EmailInternalSignerConfig) {
        super(config);
    }

    locator() {
        return `solana-keypair:${this.config.signerAddress}`;
    }

    async signMessage() {
        return await Promise.reject(new Error("signMessage method not implemented for email signer"));
    }

    async signTransaction(transaction: string): Promise<{ signature: string }> {
        await this.handleAuthRequired();

        const transactionBytes = base58.decode(transaction);
        const deserializedTransaction = VersionedTransaction.deserialize(transactionBytes);
        const messageData = deserializedTransaction.message.serialize();

        const res = await this.config._handshakeParent?.sendAction({
            event: "request:sign",
            responseEvent: "response:sign",
            data: {
                authData: {
                    jwt: this.config.crossmint.experimental_customAuth?.jwt ?? "",
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

            if (publicKey == null) {
                throw new Error("No public key found");
            }

            if (publicKey.encoding !== "base58" || publicKey.keyType !== "ed25519" || publicKey.bytes == null) {
                throw new Error(
                    "Not supported. Expected public key to be in base58 encoding and ed25519 key type. Got: " +
                        JSON.stringify(publicKey)
                );
            }

            return publicKey.bytes;
        } catch (error) {
            console.error("[EmailSigner] Failed to pregenerate signer:", error);
            throw error;
        }
    }
}
