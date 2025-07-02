import type { EmailInternalSignerConfig, NonCustodialSignerType, PhoneInternalSignerConfig } from "../types";
import { NonCustodialSignerApiClient } from "./ncs-signer-api-client";
import { NonCustodialSigner, DEFAULT_EVENT_OPTIONS } from "./ncs-signer";
import type { Crossmint } from "@crossmint/common-sdk-base";
import { Address, PublicKey, PersonalMessage } from "ox";
import { isHex, toHex, type Hex } from "viem";

export class EvmNcsSigner extends NonCustodialSigner {
    constructor(config: EmailInternalSignerConfig | PhoneInternalSignerConfig) {
        super(config);
    }

    locator() {
        return `evm-keypair:${this.config.signerAddress}`;
    }

    async signMessage(message: string) {
        const messageRaw = isHex(message) ? (message as Hex) : toHex(message);
        const messageToSign = PersonalMessage.getSignPayload(messageRaw);
        return await this.sign(messageToSign);
    }

    async signTransaction(transaction: string): Promise<{ signature: string }> {
        return await this.sign(transaction);
    }

    private async sign(raw: string): Promise<{ signature: string }> {
        await this.handleAuthRequired();
        const jwt = this.getJwtOrThrow();

        const hexString = raw.replace("0x", "");

        const res = await this.config.clientTEEConnection?.sendAction({
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
        EvmNcsSigner.verifyPublicKeyFormat(res.publicKey);
        return { signature: res.signature.bytes };
    }

    static async pregenerateSigner(type: NonCustodialSignerType, value: string, crossmint: Crossmint): Promise<string> {
        try {
            const response = await new NonCustodialSignerApiClient(crossmint).pregenerateSigner(
                type,
                value,
                "secp256k1"
            );
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
