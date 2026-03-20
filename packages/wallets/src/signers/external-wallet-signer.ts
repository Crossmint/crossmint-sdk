import type { Chain } from "../chains/chains";
import type { ExternalWalletInternalSignerConfig, ExternalWalletSignerLocator, SignerAdapter } from "./types";

export abstract class ExternalWalletSigner<C extends Chain> implements SignerAdapter {
    type = "external-wallet" as const;
    protected _address: string;

    constructor(protected config: ExternalWalletInternalSignerConfig<C>) {
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
