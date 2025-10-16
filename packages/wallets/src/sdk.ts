import { createCrossmint, type Crossmint } from "@crossmint/common-sdk-base";
import { ApiClient } from "./api";
import { WalletFactory } from "./wallets/wallet-factory";
import type { Wallet } from "./wallets/wallet";
import type { Chain } from "./chains/chains";
import type { WalletArgsFor, WalletCreateArgs } from "./wallets/types";

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
     * @returns An existing wallet or a new wallet
     */
    public async getOrCreateWallet<C extends Chain>(options: WalletCreateArgs<C>): Promise<Wallet<C>> {
        return await this.walletFactory.getOrCreateWallet(options);
    }

    /**
     * Get an existing wallet
     * Can be called on the client side or server side
     * If called on the client side, just the wallet options must be provided
     * If called on the server side, the wallet locator and options must be provided
     * @param argsOrLocator - Wallet locator or wallet options
     * @param maybeArgs - Wallet options
     * @returns A wallet if found, throws WalletNotAvailableError if not found
     */
    public async getWallet<C extends Chain>(args: WalletArgsFor<C>): Promise<Wallet<C>>;
    public async getWallet<C extends Chain>(walletLocator: string, args: WalletArgsFor<C>): Promise<Wallet<C>>;
    public async getWallet<C extends Chain>(
        argsOrLocator: string | WalletArgsFor<C>,
        maybeArgs?: WalletArgsFor<C>
    ): Promise<Wallet<C>> {
        if (typeof argsOrLocator === "string") {
            if (maybeArgs == null) {
                throw new Error("Args parameter is required when walletLocator is provided");
            }
            return await this.walletFactory.getWallet(argsOrLocator, maybeArgs);
        }
        return await this.walletFactory.getWallet(argsOrLocator);
    }

    /**
     * Create a new wallet, can only be called on the server side
     * @param options - Wallet options
     * @returns A new wallet
     */
    public async createWallet<C extends Chain>(options: WalletCreateArgs<C>): Promise<Wallet<C>> {
        return await this.walletFactory.createWallet(options);
    }
}

export { Crossmint };
export { createCrossmint };
