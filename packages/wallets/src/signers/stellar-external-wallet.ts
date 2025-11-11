import type { ExternalWalletInternalSignerConfig } from "./types";
import type { StellarChain } from "@/chains/chains";
import { ExternalWalletSigner } from "./external-wallet-signer";
import { StellarShadowSigner, type ShadowSignerStorage } from "./shadow-signer";

export class StellarExternalWalletSigner extends ExternalWalletSigner<StellarChain> {
    onSignStellarTransaction?: (payload: string) => Promise<string>;
    protected shadowSigner?: StellarShadowSigner;
    protected shadowSignerStorage?: ShadowSignerStorage;

    constructor(
        config: ExternalWalletInternalSignerConfig<StellarChain>,
        walletAddress?: string,
        shadowSignerEnabled?: boolean,
        shadowSignerStorage?: ShadowSignerStorage
    ) {
        super(config);
        this.onSignStellarTransaction = config.onSignStellarTransaction;
        this.shadowSignerStorage = shadowSignerStorage;
        this.shadowSigner = new StellarShadowSigner(walletAddress, this.shadowSignerStorage, shadowSignerEnabled);
    }

    async signMessage() {
        return await Promise.reject(new Error("signMessage method not implemented for stellar external wallet signer"));
    }

    async signTransaction(payload: string) {
        if (this.shadowSigner?.hasShadowSigner()) {
            return await this.shadowSigner.signTransaction(payload);
        }
        if (this.onSignStellarTransaction == null) {
            return await Promise.reject(
                new Error(
                    "onSignStellarTransaction method is required to sign transactions with a Stellar external wallet"
                )
            );
        }

        const signedTx = await this.onSignStellarTransaction(payload);
        return { signature: signedTx };
    }
}
