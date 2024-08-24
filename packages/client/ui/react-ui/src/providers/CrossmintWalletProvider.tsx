import { useCrossmint } from "@/hooks";
import { ReactNode, createContext, useEffect, useMemo, useState } from "react";

import { EVMSmartWallet, SmartWalletError, SmartWalletSDK } from "@crossmint/client-sdk-smart-wallet";

export type CrossmintWalletConfig = {
    type: "evm-smart-wallet";
    defaultChain: "polygon-amoy" | "base-sepolia" | "optimism-sepolia" | "arbitrum-sepolia";
    createOnLogin: "all-users" | "off";
};

type WalletStatus = "not-loaded" | "in-progress" | "loaded" | "loading-error";

// Valid states
type WalletState =
    | { status: "not-loaded" | "in-progress" }
    | { status: "loaded"; wallet: EVMSmartWallet }
    | { status: "loading-error"; error: SmartWalletError };

// Intersections are not ergonomic, expose this instead.
type WalletContext = {
    status: WalletStatus;
    wallet?: EVMSmartWallet;
    error?: SmartWalletError;
    getOrCreateWallet: () => Promise<void>;
};

export const WalletContext = createContext<WalletContext>({
    status: "not-loaded",
    getOrCreateWallet: async () => {},
});

export function CrossmintWalletProvider({ children, config }: { config: CrossmintWalletConfig; children: ReactNode }) {
    const { crossmint } = useCrossmint("CrossmintWalletProvider must be used within CrossmintProvider");

    const [state, setState] = useState<WalletState>({
        status: "not-loaded",
    });

    const smartWalletSDK = useMemo(() => SmartWalletSDK.init({ clientApiKey: crossmint.apiKey }), [crossmint.apiKey]);

    const getOrCreateWallet = async () => {
        if (!crossmint.jwt) {
            console.error("JWT is not available");
            return;
        }

        setState(() => ({ status: "in-progress" }));
        try {
            const wallet = await smartWalletSDK.getOrCreateWallet({ jwt: crossmint.jwt }, config.defaultChain);
            setState(() => ({ status: "loaded", wallet }));
        } catch (error: any) {
            console.error("There was an error creating a wallet ", error);
            setState(() => ({ status: "loading-error", error: error as SmartWalletError })); // TODO
        }
    };

    useEffect(() => {
        if (config.createOnLogin === "all-users" && crossmint.jwt) {
            console.log("Getting or Creating wallet");
            getOrCreateWallet();
        }

        if (state.status === "loaded" && !crossmint.jwt) {
            // implies a logout has occurred, clear wallet
            console.log("Clearing wallet");
            setState({
                status: "not-loaded",
            });
        }
    }, [crossmint.jwt, config.createOnLogin]);

    return <WalletContext.Provider value={{ ...state, getOrCreateWallet }}>{children}</WalletContext.Provider>;
}
