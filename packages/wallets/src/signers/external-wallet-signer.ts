import type { ExternalWalletInternalSignerConfigBase, ExternalWalletSignerLocator, Signer } from "./types";

export abstract class ExternalWalletSigner implements Signer {
    type = "external-wallet" as const;
    protected _address: string;

    constructor(protected config: ExternalWalletInternalSignerConfigBase) {
        if (config.address == null) {
            throw new Error("Please provide an address for the External Wallet Signer");
        }
        this._address = config.address;
    }

    address() {
        return this._address;
    }

    locator(): ExternalWalletSignerLocator {
        return this.config.locator;
    }

    abstract signMessage(message: string): Promise<{ signature: string }>;
    abstract signTransaction(transaction: string): Promise<{ signature: string }>;
}
