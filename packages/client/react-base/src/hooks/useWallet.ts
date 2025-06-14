import { useContext } from "react";
import {
    CrossmintWalletBaseContext,
    type CrossmintWalletBaseContext as WalletContextType,
} from "@/providers/CrossmintWalletBaseProvider";

export function useWallet(): WalletContextType {
    const walletContext = useContext(CrossmintWalletBaseContext);
    if (!walletContext) {
        throw new Error("useWallet must be used within CrossmintWalletProvider");
    }

    return walletContext;
}
