import { type Crossmint, createCrossmint } from "@crossmint/common-sdk-base";

import { ApiClient } from "./api/index.js";
import { WalletFactory } from "./services/wallet-factory";
import type { WalletTypeToArgs, WalletTypeToWallet, WalletTypeToWalletData } from "./services/types.js";
import type { WalletOptions } from "./utils/options.js";

type WalletType = keyof WalletTypeToArgs;

export class CrossmintWallet {
    private constructor(
        crossmint: Crossmint,
        private readonly apiClient = new ApiClient(crossmint),
        private readonly walletFactory = new WalletFactory(apiClient)
    ) {}

    public static from(crossmint: Crossmint): CrossmintWallet {
        return new CrossmintWallet(crossmint);
    }

    public getOrCreateWallet<T extends WalletType>(
        type: T,
        args: WalletTypeToArgs[T],
        options?: WalletOptions
    ): Promise<WalletTypeToWallet[T]> {
        return this.walletFactory.getOrCreateWallet(type, args, options);
    }

    public getWallet<T extends WalletType>(
        address: string,
        type: T,
        args: WalletTypeToArgs[T],
        options?: WalletOptions
    ): Promise<WalletTypeToWallet[T]> {
        return this.walletFactory.getWallet(address, type, args, options);
    }

    public async findWalletData<T extends WalletType>(
        type: T,
        address?: string
    ): Promise<WalletTypeToWalletData[T] | null> {
        const locator = this.apiClient.isServerSide ? address : `me:${type}`;
        if (!locator) {
            throw new Error("Address is required for server wallets");
        }
        const response = await this.apiClient.getWallet(locator);
        // @ts-ignore
        if (response.error === true) {
            return null;
        }
        return response as WalletTypeToWalletData[T];
    }
}

export { Crossmint };
export { createCrossmint };
