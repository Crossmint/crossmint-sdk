import { createCrossmint, type Crossmint } from "@crossmint/common-sdk-base";
import { ApiClient } from "./api";
import { WalletFactory } from "./wallets/wallet-factory";
import type { Wallet } from "./wallets/wallet";
import type { Chain } from "./chains/chains";
import type { WalletArgsFor } from "./wallets/types";
import { initWalletsLogger, walletsLogger } from "./logger";

export class CrossmintWallets {
    private readonly walletFactory: WalletFactory;
    private static loggerInitialized = false;

    private constructor(crossmint: Crossmint) {
        if (!CrossmintWallets.loggerInitialized) {
            initWalletsLogger(crossmint.apiKey);
            CrossmintWallets.loggerInitialized = true;
        }

        const apiClient = new ApiClient(crossmint);
        this.walletFactory = new WalletFactory(apiClient);

        // Set user context if available
        if (crossmint.apiKey != null) {
            // Extract user identifier from API key if possible
            // For now, we'll just log SDK initialization
            walletsLogger.info("wallets.sdk.initialized", {
                environment: apiClient.environment,
                isServerSide: apiClient.isServerSide,
            });
        }
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
     * @returns An existing wallet or a new wallet
     */
    public async getOrCreateWallet<C extends Chain>(options: WalletArgsFor<C>): Promise<Wallet<C>> {
        return await this.walletFactory.getOrCreateWallet(options);
    }

    /**
     * Get an existing wallet by its locator, can only be called on the server side
     * @param walletLocator - Wallet locator
     * @param options - Wallet options
     * @returns A wallet if found, throws WalletNotAvailableError if not found
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
