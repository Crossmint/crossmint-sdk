import { useContext } from "react";

import { WalletContext } from "../providers/CrossmintWalletProvider";

export function useWallet() {
    const context = useContext(WalletContext);

    if (!context) {
        throw new Error("useWallet must be used within CrossmintAuthProvider or CrossmintWalletProvider");
    }

    const { walletState, getOrCreateWallet, createPasskeySigner, clearWallet } = context;

    return {
        wallet: walletState.status === "loaded" ? walletState.wallet : undefined,
        status: walletState.status,
        getOrCreateWallet,
        createPasskeySigner,
        clearWallet,
    };
}
