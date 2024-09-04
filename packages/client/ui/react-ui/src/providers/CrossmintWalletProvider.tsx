import { ReactNode, createContext, useEffect, useMemo, useState } from "react";

import {
    EVMSmartWallet,
    EVMSmartWalletChain,
    SmartWalletError,
    SmartWalletSDK,
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
    getOrCreateWallet: () => Promise<boolean>;
};

export const WalletContext = createContext<WalletContext>({
    status: "not-loaded",
    getOrCreateWallet: async () => false,
});

export function CrossmintWalletProvider({
    children,
    defaultChain,
    createOnInit,
    walletConfig,
}: {
    defaultChain: EVMSmartWalletChain;
    createOnInit: boolean;
    children: ReactNode;
    walletConfig?: WalletParams & { type: "evm-smart-wallet" };
}) {
    const { crossmint } = useCrossmint("CrossmintWalletProvider must be used within CrossmintProvider");
    const smartWalletSDK = useMemo(() => SmartWalletSDK.init({ clientApiKey: crossmint.apiKey }), [crossmint.apiKey]);

    const [state, setState] = useState<ValidWalletState>({ status: "not-loaded" });

    const getOrCreateWalletInternal = async (jwt: string, params: WalletParams) => {
        try {
            setState({ status: "in-progress" });
            const wallet = await smartWalletSDK.getOrCreateWallet({ jwt }, defaultChain, params);
            setState({ status: "loaded", wallet });
        } catch (error: unknown) {
            console.error("There was an error creating a wallet ", error);
            setState(deriveErrorState(error));
        }
    };

    useEffect(() => {
        if (createOnInit && walletConfig != null && crossmint.jwt != null && state.status === "not-loaded") {
            console.log("Getting or Creating wallet");
            getOrCreateWalletInternal(crossmint.jwt, walletConfig);
            return;
        }

        if (state.status === "loaded" && crossmint.jwt == null) {
            console.log("Clearing wallet");
            setState({ status: "not-loaded" });
            return;
        }
    }, [crossmint, createOnInit, state.status, walletConfig]);

    const getOrCreateWalletExternal = async () => {
        if (crossmint.jwt == null) {
            console.log("No authenticated user, not creating wallet.");
            return false;
        }

        if (walletConfig == null) {
            console.log("No wallet config provided, not creating wallet.");
            return false;
        }

        if (state.status === "loaded" || state.status === "in-progress") {
            console.log("Wallet is already loaded, or is currently loading.");
            return false;
        }

        getOrCreateWalletInternal(crossmint.jwt, walletConfig);
        return true;
    };

    return (
        <WalletContext.Provider value={{ ...state, getOrCreateWallet: getOrCreateWalletExternal }}>
            {children}
        </WalletContext.Provider>
    );
}
