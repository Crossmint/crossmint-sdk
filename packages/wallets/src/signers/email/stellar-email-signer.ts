import { StrKey } from "@stellar/stellar-sdk";
import base58 from "bs58";
import type { EmailInternalSignerConfig } from "../types";
import { EmailSignerApiClient } from "./email-signer-api-client";
import { EmailSigner } from "./email-signer";
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

    async signTransaction(): Promise<{ signature: string }> {
        return await Promise.reject(new Error("signTransaction method not implemented for stellar email signer"));
    }

    static async pregenerateSigner(email: string, crossmint: Crossmint): Promise<string> {
        const emailToUse = email;
        if (emailToUse == null || emailToUse.trim() === "") {
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
}
