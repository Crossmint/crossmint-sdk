import { createContext } from "react";
import type { EVMSmartWallet, SolanaSmartWallet } from "@crossmint/wallets-sdk";

import type { GetOrCreateWalletProps } from "@/types/wallet";

type WalletContextFunctions = {
    getOrCreateWallet: (args: GetOrCreateWalletProps) => Promise<{ startedCreation: boolean; reason?: string }>;
    clearWallet: () => void;
};

type WalletType = {
    "evm-smart-wallet": EVMSmartWallet;
    "solana-smart-wallet": SolanaSmartWallet;
};

type LoadedWalletState<T extends keyof WalletType> = {
    status: "loaded";
    wallet: WalletType[T];
    type: T;
    error?: undefined;
};

type WalletContext =
    | ({
          status: "not-loaded" | "in-progress";
          wallet?: undefined;
          type?: undefined;
          error?: undefined;
      } & WalletContextFunctions)
    | ({
          status: "loading-error";
          wallet?: undefined;
          type?: undefined;
          error: string;
      } & WalletContextFunctions)
    | (LoadedWalletState<"evm-smart-wallet"> & WalletContextFunctions)
    | (LoadedWalletState<"solana-smart-wallet"> & WalletContextFunctions);

export const WalletContext = createContext<WalletContext>({
    status: "not-loaded",
    getOrCreateWallet: () => Promise.resolve({ startedCreation: false }),
    clearWallet: () => {},
});
