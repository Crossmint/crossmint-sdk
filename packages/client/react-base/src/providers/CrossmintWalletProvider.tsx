import { createContext, type Dispatch, type ReactNode, type SetStateAction, useMemo } from "react";
import type { EVMSmartWallet, SolanaSmartWallet } from "@crossmint/wallets-sdk";
import { CrossmintWallets } from "@crossmint/wallets-sdk";

import type { GetOrCreateWalletProps } from "@/types/wallet";
import { useWalletState } from "@/hooks/useWalletState";
import { useCrossmint } from "@/hooks";

export type ValidWalletState =
    | { status: "not-loaded" | "in-progress" }
    | { status: "loaded"; wallet: EVMSmartWallet; type: "evm-smart-wallet" }
    | { status: "loaded"; wallet: SolanaSmartWallet; type: "solana-smart-wallet" }
    | { status: "loading-error"; error: string };

type WalletContextFunctions = {
    getOrCreateWallet: (args: GetOrCreateWalletProps) => Promise<{ startedCreation: boolean; reason?: string }>;
    setState: Dispatch<SetStateAction<ValidWalletState>>;
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
    setState: () => {},
    getOrCreateWallet: () => Promise.resolve({ startedCreation: false }),
    clearWallet: () => null,
});

export function deriveErrorState(error: unknown): {
    status: "loading-error";
    error: string;
} {
    const message = error instanceof Error ? error.message : String(error);
    return {
        status: "loading-error",
        error: message,
    };
}

export function CrossmintWalletProvider({
    children,
}: {
    children: ReactNode;
}) {
    const { crossmint } = useCrossmint("CrossmintWalletProvider must be used within CrossmintProvider");
    const smartWalletSDK = useMemo(() => CrossmintWallets.from(crossmint), [crossmint]);

    const {
        state: walletState,
        setState,
        getOrCreateWallet,
        clearWallet,
    } = useWalletState({
        crossmintWallets: smartWalletSDK,
        crossmintJwt: crossmint.jwt ?? null,
    });

    return (
        <WalletContext.Provider
            value={{
                ...walletState,
                setState,
                getOrCreateWallet,
                clearWallet,
            }}
        >
            {children}
        </WalletContext.Provider>
    );
}
