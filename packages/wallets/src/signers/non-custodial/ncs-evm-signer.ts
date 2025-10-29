import type { EmailInternalSignerConfig, PhoneInternalSignerConfig, EVM256KeypairInternalSignerConfig } from "../types";
import { NonCustodialSigner, DEFAULT_EVENT_OPTIONS } from "./ncs-signer";
import { PersonalMessage } from "ox";
import { isHex, toHex, type Hex } from "viem";
import type { ShadowSignerData, ShadowSignerStorage } from "@/signers/shadow-signer";
import { EVM256KeypairSigner } from "../evm-p256-keypair";

export class EVMNonCustodialSigner extends NonCustodialSigner {
    constructor(
        config: EmailInternalSignerConfig | PhoneInternalSignerConfig,
        walletAddress: string,
        shadowSignerStorage?: ShadowSignerStorage
    ) {
        super(config, shadowSignerStorage);
        this.initializeShadowSigner(walletAddress, EVM256KeypairSigner);
    }

    async signMessage(message: string) {
        const messageRaw = isHex(message) ? (message as Hex) : toHex(message);
        const messageToSign = PersonalMessage.getSignPayload(messageRaw);
        return await this.sign(messageToSign);
    }

    async signTransaction(transaction: string): Promise<{ signature: string }> {
        if (this.shadowSigner != null) {
            return await this.shadowSigner.signTransaction(transaction);
        }
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
        EVMNonCustodialSigner.verifyPublicKeyFormat(res.publicKey);
        return { signature: res.signature.bytes };
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

    protected getShadowSignerConfig(
        shadowSigner: ShadowSignerData,
        _walletAddress: string
    ): EVM256KeypairInternalSignerConfig {
        return {
            type: "evm-p256-keypair",
            publicKey: shadowSigner.publicKey,
            chain: shadowSigner.chain,
            locator: `evm-p256-keypair:${shadowSigner.chain}:${shadowSigner.publicKey}`,
            onSignTransaction: async (pubKey: string, data: Uint8Array) => {
                return await this.shadowSignerStorage.sign(pubKey, data);
            },
        };
    }
}
