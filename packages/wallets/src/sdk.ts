import { type Crossmint, createCrossmint } from "@crossmint/common-sdk-base";

import { ApiClient } from "./api/index.js";
import { WalletFactory } from "./services/wallet-factory";
import type { WalletTypeToArgs, WalletTypeToWallet } from "./services/types.js";
import type { WalletOptions } from "./utils/options.js";

type WalletType = keyof WalletTypeToArgs;

export class CrossmintWallets {
    private constructor(
        crossmint: Crossmint,
        apiClient = new ApiClient(crossmint),
        private readonly walletFactory = new WalletFactory(apiClient)
    ) {}

    public static from(crossmint: Crossmint): CrossmintWallets {
        return new CrossmintWallets(crossmint);
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
}

export { Crossmint };
export { createCrossmint };
