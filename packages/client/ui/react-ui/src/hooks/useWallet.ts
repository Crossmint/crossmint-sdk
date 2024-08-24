import { WalletContext } from "@/providers/CrossmintWalletProvider";
import { useContext } from "react";

export function useWallet() {
    const walletContext = useContext(WalletContext);

    if (!walletContext) {
        throw new Error("useWallet must be used within a CrossmintAuthProvider or CrossmintWalletProvider");
    }

    return { ...walletContext };
}
