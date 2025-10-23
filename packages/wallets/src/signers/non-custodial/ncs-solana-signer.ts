import { PublicKey, VersionedTransaction } from "@solana/web3.js";
import base58 from "bs58";
import type {
    EmailInternalSignerConfig,
    ExternalWalletInternalSignerConfig,
    PhoneInternalSignerConfig,
} from "../types";
import { NonCustodialSigner, DEFAULT_EVENT_OPTIONS } from "./ncs-signer";
import { getShadowSignerPrivateKey, type ShadowSignerData } from "@/utils/shadow-signer";
import { SolanaExternalWalletSigner } from "../solana-external-wallet";
import type { SolanaChain } from "@/chains/chains";

export class SolanaNonCustodialSigner extends NonCustodialSigner {
    constructor(config: EmailInternalSignerConfig | PhoneInternalSignerConfig, walletAddress: string) {
        super(config);
        this.initializeShadowSigner(walletAddress, SolanaExternalWalletSigner);
    }

    async signMessage() {
        return await Promise.reject(new Error("signMessage method not implemented for email signer"));
    }

    async signTransaction(transaction: string): Promise<{ signature: string }> {
        if (this.shadowSigner != null) {
            return await this.shadowSigner.signTransaction(transaction);
        }
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
                    bytes: base58.encode(new Uint8Array(messageData)),
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
        SolanaNonCustodialSigner.verifyPublicKeyFormat(res.publicKey);
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

    protected getShadowSignerConfig(
        shadowData: ShadowSignerData,
        walletAddress: string
    ): ExternalWalletInternalSignerConfig<SolanaChain> {
        return {
            type: "external-wallet",
            address: shadowData.publicKey,
            locator: `external-wallet:${shadowData.publicKey}`,
            onSignTransaction: async (transaction) => {
                const privateKey = await getShadowSignerPrivateKey(walletAddress);
                if (!privateKey) {
                    throw new Error("Shadow signer private key not found");
                }

                const messageBytes = new Uint8Array(transaction.message.serialize());
                const signatureBuffer = await window.crypto.subtle.sign({ name: "Ed25519" }, privateKey, messageBytes);

                const signature = new Uint8Array(signatureBuffer);
                transaction.addSignature(new PublicKey(shadowData.publicKey), signature);

                return transaction;
            },
        };
    }
}
