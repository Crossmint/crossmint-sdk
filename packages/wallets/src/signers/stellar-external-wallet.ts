import type { ExternalWalletInternalSignerConfig } from "./types";
import type { StellarChain } from "@/chains/chains";
import { ExternalWalletSigner } from "./external-wallet-signer";

export class StellarExternalWalletSigner extends ExternalWalletSigner<StellarChain> {
    private onSign?: (payload: string) => Promise<string>;

    constructor(config: ExternalWalletInternalSignerConfig<StellarChain>) {
        super(config);
        this.onSign = config.onSign;
    }

    async signMessage() {
        return await Promise.reject(new Error("signMessage method not implemented for stellar external wallet signer"));
    }

    async signTransaction(payload: string) {
        if (this.onSign == null) {
            return await Promise.reject(
                new Error("onSign callback is required to sign transactions with a Stellar external wallet")
            );
        }

        const signedTx = await this.onSign(payload);
        return { signature: signedTx };
    }
}
