"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
const WALLET_TYPE_STORAGE_KEY = "crossmint-wallets-demo-preferred-network";

// Define wallet types
export type WalletType = "evm-smart-wallet" | "solana-smart-wallet" | undefined;

// Define the context type
interface WalletConfigContextType {
    walletType: WalletType;
    setWalletType: (type: WalletType) => void;
}

// Create the context with default values
const WalletConfigContext = createContext<WalletConfigContextType>({
    walletType: undefined,
    setWalletType: () => {},
});

export function WalletConfigProvider({ children }: { children: ReactNode }) {
    const [walletType, setWalletType] = useState<WalletType>();
    useEffect(() => {
        // Load initial state from localStorage
        const savedWalletType = localStorage.getItem(WALLET_TYPE_STORAGE_KEY) as WalletType;
        if (savedWalletType) {
            setWalletType(savedWalletType);
        }
    }, []);

    useEffect(() => {
        if (walletType != null) {
            localStorage.setItem(WALLET_TYPE_STORAGE_KEY, walletType);
        }
    }, [walletType]);

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
