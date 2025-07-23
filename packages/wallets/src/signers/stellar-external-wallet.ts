import type { ExternalWalletInternalSignerConfig, Signer } from "./types";
import type { StellarChain } from "@/chains/chains";

export class StellarExternalWalletSigner implements Signer {
    type = "external-wallet" as const;
    address: string;
    onSignStellarTransaction?: (transaction: string) => Promise<string>;

    constructor(private config: ExternalWalletInternalSignerConfig<StellarChain>) {
        if (config.address == null) {
            throw new Error("Please provide an address for the External Wallet Signer");
        }
        this.address = config.address;
        this.onSignStellarTransaction = config.onSignStellarTransaction;
    }

    locator() {
        return this.config.locator;
    }

    async signMessage() {
        return await Promise.reject(new Error("signMessage method not implemented for stellar external wallet signer"));
    }

    async signTransaction(transaction: string) {
        if (this.onSignStellarTransaction == null) {
            return await Promise.reject(
                new Error(
                    "onSignStellarTransaction method is required to sign transactions with a Stellar external wallet"
                )
            );
        }

        const signedTx = await this.onSignStellarTransaction(transaction);
        return { signature: signedTx };
    }
}
