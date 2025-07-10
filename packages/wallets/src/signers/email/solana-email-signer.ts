import { VersionedTransaction } from "@solana/web3.js";
import base58 from "bs58";
import type { EmailInternalSignerConfig } from "../types";
import { EmailSigner, DEFAULT_EVENT_OPTIONS } from "./email-signer";

export class SolanaEmailSigner extends EmailSigner {
    constructor(config: EmailInternalSignerConfig) {
        super(config);
    }

    locator() {
        return this.config.locator;
    }

    async signMessage() {
        return await Promise.reject(new Error("signMessage method not implemented for email signer"));
    }

    async signTransaction(transaction: string): Promise<{ signature: string }> {
        await this.handleAuthRequired();
        const jwt = this.getJwtOrThrow();

        const transactionBytes = base58.decode(transaction);
        const deserializedTransaction = VersionedTransaction.deserialize(transactionBytes);
        const messageData = deserializedTransaction.message.serialize();

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
        SolanaEmailSigner.verifyPublicKeyFormat(res.publicKey);
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
}
