import { useContext } from "react";

import { WalletContext } from "../providers/CrossmintWalletProvider";

export function useWallet() {
    const walletContext = useContext(WalletContext);

    if (!walletContext) {
        throw new Error("useWallet must be used within CrossmintAuthProvider or CrossmintWalletProvider");
    }

    return walletContext;
}
