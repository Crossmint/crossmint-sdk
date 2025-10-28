import type { ExternalWalletInternalSignerConfig, Signer } from "./types";
import type { Chain } from "../chains/chains";

export abstract class ExternalWalletSigner<C extends Chain> implements Signer {
    type = "external-wallet" as const;
    protected _address: string;

    constructor(protected config: ExternalWalletInternalSignerConfig<C>) {
        if (config.address == null) {
            throw new Error("Please provide an address for the External Wallet Signer");
        }
        this._address = config.address;
    }

    address() {
        return this._address;
    }

    locator() {
        return this.config.locator;
    }

    abstract signMessage(message: string): Promise<{ signature: string }>;
    abstract signTransaction(transaction: string): Promise<{ signature: string }>;
}
