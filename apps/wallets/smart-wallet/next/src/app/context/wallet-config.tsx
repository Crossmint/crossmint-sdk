"use client";

import { createContext, useContext, useState, type ReactNode } from "react";

// Define wallet types
export type WalletType = "evm-smart-wallet" | "solana-smart-wallet";

// Define the context type
interface WalletConfigContextType {
    walletType: WalletType | "";
    setWalletType: (type: WalletType | "") => void;
}

// Create the context with default values
const WalletConfigContext = createContext<WalletConfigContextType>({
    walletType: "",
    setWalletType: () => {},
});

export function WalletConfigProvider({ children }: { children: ReactNode }) {
    const [walletType, setWalletType] = useState<WalletType | "">("");

    return (
        <WalletConfigContext.Provider value={{ walletType, setWalletType }}>{children}</WalletConfigContext.Provider>
    );
}

export function useWalletConfig() {
    const context = useContext(WalletConfigContext);

    if (context === undefined) {
        throw new Error("useWalletConfig must be used within a WalletConfigProvider");
    }

    return context;
}
