import { createContext, type Dispatch, type ReactNode, type SetStateAction, useEffect, useMemo } from "react";
import { type Chain, CrossmintWallets, type Wallet, type WalletArgsFor } from "@crossmint/wallets-sdk";
import type { HandshakeParent } from "@crossmint/client-sdk-window";
import type { signerInboundEvents, signerOutboundEvents } from "@crossmint/client-signers";

import { useWalletState } from "@/hooks/useWalletState";
import { useCrossmint } from "@/hooks";

export type ValidWalletState =
    | { status: "not-loaded" | "in-progress" }
    | { status: "loaded"; wallet: Wallet<Chain> }
    | { status: "error"; error: string };

type WalletContextFunctions = {
    getOrCreateWallet: <C extends Chain>(
        props: WalletArgsFor<C>
    ) => Promise<{ startedCreation: boolean; reason?: string }>;
    setState: Dispatch<SetStateAction<ValidWalletState>>;
    clearWallet: () => void;
    // Email signer functions
    needsAuth: boolean;
    sendEmailWithOtp: (() => Promise<void>) | null;
    verifyOtp: ((otp: string) => Promise<void>) | null;
    reject: ((error: Error) => void) | null;
};

type LoadedWalletState<C extends Chain> = {
    status: "loaded";
    wallet: Wallet<C>;
    error?: undefined;
};

export type WalletContext<C extends Chain = Chain> =
    | ({
          status: "not-loaded" | "in-progress";
          wallet?: undefined;
          error?: undefined;
      } & WalletContextFunctions)
    | ({
          status: "error";
          wallet?: undefined;
          error: string;
      } & WalletContextFunctions)
    | (LoadedWalletState<C> & WalletContextFunctions);

export const WalletContext = createContext<WalletContext>({
    status: "not-loaded",
    setState: () => {},
    getOrCreateWallet: () => Promise.resolve({ startedCreation: false }),
    clearWallet: () => null,
    // Email signer functions
    needsAuth: false,
    sendEmailWithOtp: null,
    verifyOtp: null,
    reject: null,
});

export function deriveErrorState(error: unknown): {
    status: "error";
    error: string;
} {
    const message = error instanceof Error ? error.message : String(error);
    return {
        status: "error",
        error: message,
    };
}

export interface CrossmintWalletProviderProps {
    children: ReactNode;
    getHandshakeParent?: () => HandshakeParent<typeof signerOutboundEvents, typeof signerInboundEvents>;
}

export function CrossmintWalletProvider({ children, getHandshakeParent }: CrossmintWalletProviderProps) {
    const { crossmint } = useCrossmint("CrossmintWalletProvider must be used within CrossmintProvider");
    const smartWalletSDK = useMemo(() => CrossmintWallets.from(crossmint), [crossmint]);

    const {
        state: walletState,
        setState,
        getOrCreateWallet,
        clearWallet,
        // Email signer functions
        needsAuth,
        sendEmailWithOtp,
        verifyOtp,
        reject,
    } = useWalletState({
        crossmintWallets: smartWalletSDK,
        crossmintJwt: crossmint.jwt ?? null,
        getHandshakeParent,
    });

    useEffect(() => {
        if (crossmint.jwt == null && walletState.status !== "not-loaded") {
            clearWallet();
        }
    }, [crossmint.jwt, walletState.status, clearWallet]);

    const contextValue = useMemo(
        () => ({
            ...walletState,
            setState,
            getOrCreateWallet,
            clearWallet,
            // Email signer functions
            needsAuth,
            sendEmailWithOtp,
            verifyOtp,
            reject,
        }),
        [walletState, setState, getOrCreateWallet, clearWallet, needsAuth, sendEmailWithOtp, verifyOtp, reject]
    );

    return <WalletContext.Provider value={contextValue}>{children}</WalletContext.Provider>;
}
