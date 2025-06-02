import { createCrossmint, type Crossmint } from "@crossmint/common-sdk-base";
import { ApiClient } from "./api";
import { WalletFactory, type WalletArgsFor } from "./wallets/wallet-factory";
import type { Wallet } from "./wallets/wallet";
import type { Chain } from "./chains/chains";

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
     * Get or create a wallet, can only be called on the client side
     * @param args - Wallet data
     * @param options - Wallet options
     * @returns A new wallet
     */
    public async getOrCreateWallet<C extends Chain>(options: WalletArgsFor<C>): Promise<Wallet<C>> {
        return await this.walletFactory.getOrCreateWallet(options);
    }

    /**
     * Get an existing wallet by its locator, can only be called on the server side
     * @param walletLocator - Wallet locator
     * @param options - Wallet options
     * @returns A wallet
     */
    public async getWallet<C extends Chain>(walletLocator: string, options: WalletArgsFor<C>): Promise<Wallet<C>> {
        return await this.walletFactory.getWallet(walletLocator, options);
    }

    /**
     * Create a new wallet, can only be called on the server side
     * @param options - Wallet options
     * @returns A new wallet
     */
    public async createWallet<C extends Chain>(options: WalletArgsFor<C>): Promise<Wallet<C>> {
        return await this.walletFactory.createWallet(options);
    }
}

export { Crossmint };
export { createCrossmint };
