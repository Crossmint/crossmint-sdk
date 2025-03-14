import type { Crossmint } from "@crossmint/common-sdk-base";

import { ApiClient } from "./api/index.js";
import { WalletFactory } from "./services/wallet-factory";
import type { WalletTypeToArgs, WalletTypeToWallet } from "./services/types.js";

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

    public getOrCreateWallet<T extends WalletType>(type: T, args: WalletTypeToArgs[T]): Promise<WalletTypeToWallet[T]> {
        return this.walletFactory.getOrCreateWallet(type, args);
    }
}

export { Crossmint };
