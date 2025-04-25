import type { CrossmintRecoveryKeyContextState } from "@/providers/CrossmintRecoveryKeyProvider";
import type { WalletContext as BaseWalletContext } from "@crossmint/client-sdk-react-base";
import { createContext, useContext } from "react";

export type ReactNativeWalletContextState = BaseWalletContext & CrossmintRecoveryKeyContextState;

export const WalletContext = createContext<ReactNativeWalletContextState | null>(null);

export function useWallet() {
    const context = useContext(WalletContext);
    if (context == null) {
        throw new Error("useWallet must be used within the CrossmintWalletProvider");
    }
    return context;
}
