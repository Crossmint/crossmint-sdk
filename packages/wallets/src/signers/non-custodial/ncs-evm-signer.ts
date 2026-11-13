import type { EmailInternalSignerConfig, PhoneInternalSignerConfig } from "../types";
import { NonCustodialSigner } from "./ncs-signer";
import { PersonalMessage } from "ox";
import { isHex, toHex, type Hex } from "viem";

export class EVMNonCustodialSigner extends NonCustodialSigner {
    constructor(config: EmailInternalSignerConfig | PhoneInternalSignerConfig) {
        super(config);
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

        const hexString = raw.replace("0x", "");
        const res = await this.requestSignature({
            keyType: "secp256k1",
            bytes: hexString,
            encoding: "hex",
            authId: this.getAuthId(),
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

    protected getChainKeyParams(): { scheme: "secp256k1"; encoding: "hex" } {
        return {
            scheme: "secp256k1",
            encoding: "hex",
        };
    }
}
