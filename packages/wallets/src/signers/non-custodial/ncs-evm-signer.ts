import type {
    EmailInternalSignerConfig,
    ExternalWalletInternalSignerConfig,
    PhoneInternalSignerConfig,
} from "../types";
import { NonCustodialSigner, DEFAULT_EVENT_OPTIONS } from "./ncs-signer";
import { PersonalMessage } from "ox";
import { isHex, toHex, type Hex } from "viem";
import type { EVMChain } from "../../chains/chains";
import type { ShadowSignerStorage } from "@/signers/shadow-signer";

export class EVMNonCustodialSigner extends NonCustodialSigner {
    constructor(
        config: EmailInternalSignerConfig | PhoneInternalSignerConfig,
        shadowSignerStorage?: ShadowSignerStorage
    ) {
        super(config, shadowSignerStorage);
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

    protected getShadowSignerConfig(): ExternalWalletInternalSignerConfig<EVMChain> {
        throw new Error("Shadow signer not implemented for EVM chains");
    }
}
