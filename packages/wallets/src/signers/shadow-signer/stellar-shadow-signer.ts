import { ShadowSigner } from "./shadow-signer";
import type { StellarChain } from "@/chains/chains";
import type { ExternalWalletInternalSignerConfig } from "../types";
import type { ShadowSignerData } from "./utils";
import { StellarExternalWalletSigner } from "../stellar-external-wallet";

export class StellarShadowSigner extends ShadowSigner<
    StellarChain,
    StellarExternalWalletSigner,
    ExternalWalletInternalSignerConfig<StellarChain>
> {
    protected getWrappedSignerClass() {
        return StellarExternalWalletSigner;
    }

    getShadowSignerConfig(shadowData: ShadowSignerData): ExternalWalletInternalSignerConfig<StellarChain> {
        return {
            type: "external-wallet",
            address: shadowData.publicKey,
            locator: `external-wallet:${shadowData.publicKey}`,
            onSignStellarTransaction: async (payload: string | { tx: string }) => {
                const transactionString = typeof payload === "string" ? payload : payload.tx;
                const messageBytes = Uint8Array.from(atob(transactionString), (c) => c.charCodeAt(0));

                const signature = await this.storage.sign(shadowData.publicKeyBase64, messageBytes);

                const signatureBase64 = btoa(String.fromCharCode(...signature));
                return signatureBase64;
            },
        };
    }
}
