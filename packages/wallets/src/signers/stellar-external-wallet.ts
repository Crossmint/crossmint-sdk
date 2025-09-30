import type { BaseSignResult, ExternalWalletInternalSignerConfig, PasskeySignResult, Signer } from "./types";
import type { StellarChain } from "@/chains/chains";

export class StellarExternalWalletSigner implements Signer {
    type = "external-wallet" as const;
    private _address: string;
    onSignStellarTransaction?: (payload: string) => Promise<string>;

    constructor(private config: ExternalWalletInternalSignerConfig<StellarChain>) {
        if (config.address == null) {
            throw new Error("Please provide an address for the External Wallet Signer");
        }
        this._address = config.address;
        this.onSignStellarTransaction = config.onSignStellarTransaction;
    }

    address() {
        return this._address;
    }

    locator() {
        return this.config.locator;
    }

    async sign(payload: string) {
            return await Promise.reject(new Error("signMessage method not implemented for stellar external wallet signer"));
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
