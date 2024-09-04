import { ReactNode, createContext, useMemo, useState } from "react";

import {
    EVMSmartWallet,
    EVMSmartWalletChain,
    SmartWalletError,
    SmartWalletSDK,
    UserParams,
    WalletParams,
} from "@crossmint/client-sdk-smart-wallet";

import { useCrossmint } from "../hooks";

type WalletStatus = "not-loaded" | "in-progress" | "loaded" | "loading-error";
type ValidWalletState =
    | { status: "not-loaded" | "in-progress" }
    | { status: "loaded"; wallet: EVMSmartWallet }
    | { status: "loading-error"; error: SmartWalletError };

function deriveErrorState(error: unknown): { status: "loading-error"; error: SmartWalletError } {
    if (error instanceof SmartWalletError) {
        return { status: "loading-error", error };
    }

    const message = error instanceof Error ? error.message : String(error);
    const stack = error instanceof Error ? error.stack : undefined;
    return { status: "loading-error", error: new SmartWalletError(`Unknown Wallet Error: ${message}`, stack) };
}

type WalletContext = {
    status: WalletStatus;
    wallet?: EVMSmartWallet;
    error?: SmartWalletError;
    getOrCreateWallet: (userParams: UserParams, chain: EVMSmartWalletChain, config?: WalletConfig) => void;
    clearWallet: () => void;
};

export const WalletContext = createContext<WalletContext>({
    status: "not-loaded",
    getOrCreateWallet: () => {},
    clearWallet: () => {},
});

export type WalletConfig = WalletParams & { type: "evm-smart-wallet" };

export function CrossmintWalletProvider({ children }: { children: ReactNode }) {
    const { crossmint } = useCrossmint("CrossmintWalletProvider must be used within CrossmintProvider");
    const smartWalletSDK = useMemo(() => SmartWalletSDK.init({ clientApiKey: crossmint.apiKey }), [crossmint.apiKey]);

    const [state, setState] = useState<ValidWalletState>({ status: "not-loaded" });

    const getOrCreateWallet = (
        userParams: UserParams,
        chain: EVMSmartWalletChain,
        config: WalletConfig = { type: "evm-smart-wallet", signer: { type: "PASSKEY" } }
    ) => {
        if (state.status == "in-progress") {
            console.log("Wallet already loading");
            return;
        }

        const internalCall = async () => {
            try {
                setState({ status: "in-progress" });
                const wallet = await smartWalletSDK.getOrCreateWallet(userParams, chain, config);
                setState({ status: "loaded", wallet });
            } catch (error: unknown) {
                console.error("There was an error creating a wallet ", error);
                setState(deriveErrorState(error));
            }
        };

        internalCall();
    };

    const clearWallet = () => {
        setState({ status: "not-loaded" });
    };

    return (
        <WalletContext.Provider value={{ ...state, getOrCreateWallet, clearWallet }}>{children}</WalletContext.Provider>
    );
}
