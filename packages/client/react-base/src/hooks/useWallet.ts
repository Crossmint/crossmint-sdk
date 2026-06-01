import { useContext } from "react";
import { CrossmintWalletBaseContext } from "@/providers/CrossmintWalletBaseProvider";

export function useWallet(): CrossmintWalletBaseContext {
    const walletContext = useContext(CrossmintWalletBaseContext);
    if (!walletContext) {
        throw new Error("useWallet must be used within CrossmintWalletProvider");
    }

    return walletContext;
}
