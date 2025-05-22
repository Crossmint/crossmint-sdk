import type { Crossmint } from "@crossmint/common-sdk-base";
import { createCrossmint } from "@crossmint/common-sdk-base";
import { ApiClient } from "./api";
import { WalletFactory } from "./services/wallet-factory";
import type { Chain, GetOrCreateWalletOptions } from "./types";

export class CrossmintWallets {
    private readonly walletFactory: WalletFactory;
    private constructor(crossmint: Crossmint) {
        const apiClient = new ApiClient(crossmint);
        this.walletFactory = new WalletFactory(apiClient);
    }

    /**
     * Initialize the Wallets SDK
     * @param crossmint - Crossmint data (use `createCrossmint` to initialize)
     * @returns A new CrossmintWallets instance
     */
    public static from(crossmint: Crossmint): CrossmintWallets {
        return new CrossmintWallets(crossmint);
    }

    /**
     * Get or create a wallet
     * @param args - Wallet configuration including chain and optional owner/signer
     * @param options - Additional wallet options
     * @returns A new wallet instance
     */
    public async getOrCreateWallet<C extends Chain>(args: GetOrCreateWalletOptions<C>) {
        return await this.walletFactory.getOrCreateWallet(args);
    }

    /**
     * Get an existing wallet by address
     * @param address - Wallet address
     * @param args - Wallet configuration including chain and optional owner/signer
     * @param options - Additional wallet options
     * @returns A wallet instance
     */
    public async getWallet<C extends Chain>(address: string, args: GetOrCreateWalletOptions<C>) {
        return await this.walletFactory.getWallet(address, args);
    }
}

export { Crossmint };
export { createCrossmint };
