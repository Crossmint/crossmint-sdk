import type { EmailInternalSignerConfig } from "../types";
import { EmailSignerApiClient } from "./email-signer-api-client";
import { EmailSigner, DEFAULT_EVENT_OPTIONS } from "./email-signer";
import type { Crossmint } from "@crossmint/common-sdk-base";
import { Address, PublicKey } from "ox";

export class EvmEmailSigner extends EmailSigner {
    constructor(config: EmailInternalSignerConfig) {
        super(config);
    }

    locator() {
        return `evm-keypair:${this.config.signerAddress}`;
    }

    async signMessage() {
        return await Promise.reject(new Error("signMessage method not implemented for email signer"));
    }

    async signTransaction(transaction: string): Promise<{ signature: string }> {
        await this.handleAuthRequired();
        const jwt = this.getJwtOrThrow();

        const hexString = transaction.replace("0x", "");

        const res = await this.config._handshakeParent?.sendAction({
            event: "request:sign",
            responseEvent: "response:sign",
            data: {
                authData: {
                    jwt,
                    apiKey: this.config.crossmint.apiKey,
                },
                data: {
                    keyType: "secp256k1",
                    bytes: hexString,
                    encoding: "hex",
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
        EvmEmailSigner.verifyPublicKeyFormat(res.publicKey);
        return { signature: res.signature.bytes };
    }

    static async pregenerateSigner(email: string, crossmint: Crossmint): Promise<string> {
        const emailToUse = email ?? crossmint.experimental_customAuth?.email;
        if (emailToUse == null) {
            throw new Error("Email is required to pregenerate a signer");
        }

        try {
            const response = await new EmailSignerApiClient(crossmint).pregenerateSigner(emailToUse, "secp256k1");
            const publicKey = response.publicKey;
            this.verifyPublicKeyFormat(publicKey);
            return this.publicKeyToEvmAddress(publicKey.bytes);
        } catch (error) {
            console.error("[EvmEmailSigner] Failed to pregenerate signer:", error);
            throw error;
        }
    }

    static verifyPublicKeyFormat(publicKey: { encoding: string; keyType: string; bytes: string } | null) {
        if (publicKey == null) {
            throw new Error("No public key found");
        }

        if (publicKey.encoding !== "hex" || publicKey.keyType !== "secp256k1" || publicKey.bytes == null) {
            throw new Error(
                "Not supported. Expected public key to be in hex encoding and secp256k1 key type. Got: " +
                    JSON.stringify(publicKey)
            );
        }
    }

    private static publicKeyToEvmAddress(publicKeyHex: string): string {
        const publicKey = PublicKey.from(`0x${publicKeyHex}`);
        return Address.fromPublicKey(publicKey, { checksum: true });
    }
}
