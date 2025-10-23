import type { ExternalWalletInternalSignerConfig } from "./types";
import type { StellarChain } from "@/chains/chains";
import { ExternalWalletSigner } from "./external-wallet-signer";

export class StellarExternalWalletSigner extends ExternalWalletSigner<StellarChain> {
    onSignStellarTransaction?: (payload: string) => Promise<string>;

    constructor(config: ExternalWalletInternalSignerConfig<StellarChain>) {
        super(config);
        this.onSignStellarTransaction = config.onSignStellarTransaction;
    }

    async signMessage() {
        return await Promise.reject(new Error("signMessage method not implemented for stellar external wallet signer"));
    }

    async signTransaction(payload: string) {
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
