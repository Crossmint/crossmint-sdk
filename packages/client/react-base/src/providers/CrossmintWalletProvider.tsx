import { createContext, type Dispatch, type ReactNode, type SetStateAction, useMemo } from "react";
import { type Chain, CrossmintWallets, type Wallet, type WalletArgsFor } from "@crossmint/wallets-sdk";

import { useWalletState } from "@/hooks/useWalletState";
import { useCrossmint } from "@/hooks";

export type ValidWalletState =
    | { status: "not-loaded" | "in-progress" }
    | { status: "loaded"; wallet: Wallet<Chain> }
    | { status: "loading-error"; error: string };

type WalletContextFunctions = {
    getOrCreateWallet: <C extends Chain>(
        props: WalletArgsFor<C>
    ) => Promise<{ startedCreation: boolean; reason?: string }>;
    setState: Dispatch<SetStateAction<ValidWalletState>>;
    clearWallet: () => void;
};

type LoadedWalletState<C extends Chain> = {
    status: "loaded";
    wallet: Wallet<C>;
    error?: undefined;
};
type WalletContext<C extends Chain = Chain> =
    | ({
          status: "not-loaded" | "in-progress";
          wallet?: undefined;
          error?: undefined;
      } & WalletContextFunctions)
    | ({
          status: "loading-error";
          wallet?: undefined;
          error: string;
      } & WalletContextFunctions)
    | (LoadedWalletState<C> & WalletContextFunctions);

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
