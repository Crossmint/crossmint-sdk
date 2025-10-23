import { getShadowSigner, getShadowSignerPrivateKey, type ShadowSignerData } from "@/utils/shadow-signer";
import type {
    EmailInternalSignerConfig,
    ExternalWalletInternalSignerConfig,
    PhoneInternalSignerConfig,
} from "../types";
import { DEFAULT_EVENT_OPTIONS, NonCustodialSigner } from "./ncs-signer";
import { StellarExternalWalletSigner } from "../stellar-external-wallet";
import type { StellarChain } from "@/chains/chains";

export class StellarNonCustodialSigner extends NonCustodialSigner {
    private shadowSigner: StellarExternalWalletSigner | null = null;
    constructor(config: EmailInternalSignerConfig | PhoneInternalSignerConfig, walletAddress: string) {
        super(config);

        const shadowSigner = getShadowSigner(walletAddress);
        if (shadowSigner != null && config.shadowSigner?.enabled !== false) {
            this.shadowSigner = new StellarExternalWalletSigner(
                this.getShadowSignerConfig(shadowSigner, walletAddress)
            );
        }
    }

    async signMessage() {
        return await Promise.reject(new Error("signMessage method not implemented for stellar signer"));
    }

    async signTransaction(payload: string): Promise<{ signature: string }> {
        if (this.shadowSigner != null) {
            return await this.shadowSigner.signTransaction(payload);
        }
        await this.handleAuthRequired();
        const jwt = this.getJwtOrThrow();

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
                    bytes: payload,
                    encoding: "base64",
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
        StellarNonCustodialSigner.verifyPublicKeyFormat(res.publicKey);
        if (res.signature.encoding !== "base64") {
            throw new Error("Wrong encoding for signature. Expected base64, got " + res.signature.encoding);
        }

        return { signature: res.signature.bytes };
    }

    static verifyPublicKeyFormat(publicKey: { encoding: string; keyType: string; bytes: string } | null) {
        if (publicKey == null) {
            throw new Error("No public key found");
        }

        if (publicKey.encoding !== "base64" || publicKey.keyType !== "ed25519" || publicKey.bytes == null) {
            throw new Error(
                "Not supported. Expected public key to be in base64 encoding and ed25519 key type. Got: " +
                    JSON.stringify(publicKey)
            );
        }
    }

    private getShadowSignerConfig(
        shadowData: ShadowSignerData,
        walletAddress: string
    ): ExternalWalletInternalSignerConfig<StellarChain> {
        return {
            type: "external-wallet",
            address: shadowData.publicKey,
            locator: `external-wallet-${shadowData.publicKey}`,
            onSignStellarTransaction: async (payload) => {
                const privateKey = await getShadowSignerPrivateKey(walletAddress);
                if (!privateKey) {
                    throw new Error("Shadow signer private key not found");
                }

                const transactionString = typeof payload === "string" ? payload : (payload as any).tx;

                const messageBytes = Uint8Array.from(atob(transactionString), (c) => c.charCodeAt(0));

                const signatureBuffer = await window.crypto.subtle.sign({ name: "Ed25519" }, privateKey, messageBytes);

                const signature = new Uint8Array(signatureBuffer);
                const signatureBase64 = btoa(String.fromCharCode(...signature));
                return signatureBase64;
            },
        };
    }
}
