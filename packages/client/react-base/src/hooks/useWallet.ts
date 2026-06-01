import { useContext } from "react";
import { CrossmintWalletBaseContext } from "@/providers/CrossmintWalletBaseProvider";

/**
 * Hook to access the current wallet instance and wallet state.
 *
 * Returns the wallet context including the active wallet, loading state,
 * and methods for wallet creation and retrieval.
 * Must be used within a {@link CrossmintWalletProvider}.
 *
 * @returns The wallet context with the active wallet and wallet management methods.
 * @throws If used outside of a CrossmintWalletProvider.
 */
export function useWallet(): CrossmintWalletBaseContext {
    const walletContext = useContext(CrossmintWalletBaseContext);
    if (!walletContext) {
        throw new Error("useWallet must be used within CrossmintWalletProvider");
    }

    return walletContext;
}
