import { ShadowSigner } from "./shadow-signer";
import type { StellarChain } from "@/chains/chains";
import type { ExternalWalletInternalSignerConfig } from "../types";
import type { ShadowSignerData, ShadowSignerStorage } from "./utils";
import { StellarExternalWalletSigner } from "../stellar-external-wallet";

export class StellarShadowSigner extends ShadowSigner<StellarChain> {
    protected getExternalWalletSignerClass(): new (
        config: ExternalWalletInternalSignerConfig<StellarChain>,
        walletAddress?: string,
        shadowSignerEnabled?: boolean,
        shadowSignerStorage?: ShadowSignerStorage
    ) => StellarExternalWalletSigner {
        return StellarExternalWalletSigner;
    }

    getShadowSignerConfig(shadowData: ShadowSignerData): ExternalWalletInternalSignerConfig<StellarChain> {
        return {
            type: "external-wallet",
            address: shadowData.publicKey,
            locator: `external-wallet:${shadowData.publicKey}`,
            onSignStellarTransaction: async (payload) => {
                const transactionString = typeof payload === "string" ? payload : (payload as { tx: string }).tx;
                const messageBytes = Uint8Array.from(atob(transactionString), (c) => c.charCodeAt(0));

                const signature = await this.storage.sign(shadowData.publicKeyBase64, messageBytes);

                const signatureBase64 = btoa(String.fromCharCode(...signature));
                return signatureBase64;
            },
        };
    }
}
