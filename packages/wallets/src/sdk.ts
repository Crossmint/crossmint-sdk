import { type Crossmint, createCrossmint } from "@crossmint/common-sdk-base";

import { ApiClient } from "./api/index.js";
import { WalletFactory } from "./services/wallet-factory";
import type { WalletTypeToArgs, WalletTypeToWallet } from "./services/types.js";
import type { WalletOptions } from "./utils/options.js";

type WalletType = keyof WalletTypeToArgs;

export type CrossmintWalletsOptions = {
    appId?: string;
};

export class CrossmintWallets {
    private readonly walletFactory: WalletFactory;

    private constructor(crossmint: Crossmint, options?: CrossmintWalletsOptions) {
        const apiClient = new ApiClient(crossmint, options?.appId);
        this.walletFactory = new WalletFactory(apiClient);
    }

    /**
     * Initialize the Wallets SDK
     * @param crossmint - Crossmint data (use `createCrossmint` to initialize)
     * @returns A new CrossmintWallets instance
     */
    public static from(crossmint: Crossmint, options?: CrossmintWalletsOptions): CrossmintWallets {
        return new CrossmintWallets(crossmint, options);
    }

    /**
     * Get or create a wallet
     * @param type - Wallet type
     * @param args - Wallet data
     * @param options - Wallet options
     * @returns A new wallet
     */
    public getOrCreateWallet<T extends WalletType>(
        type: T,
        args: WalletTypeToArgs[T],
        options?: WalletOptions
    ): Promise<WalletTypeToWallet[T]> {
        return this.walletFactory.getOrCreateWallet(type, args, options);
    }

    /**
     * Get an existing wallet by address
     * @param address - Wallet address
     * @param type - Wallet type
     * @param args - Wallet data
     * @param options - Wallet options
     * @returns A wallet
     */
    public getWallet<T extends WalletType>(
        address: string,
        type: T,
        args: WalletTypeToArgs[T],
        options?: WalletOptions
    ): Promise<WalletTypeToWallet[T]> {
        return this.walletFactory.getWallet(address, type, args, options);
    }
}

export { Crossmint };
export { createCrossmint };
