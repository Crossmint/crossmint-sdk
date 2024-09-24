import { createContext, useEffect, useState } from "react";

import type { EVMSmartWallet } from "@crossmint/client-sdk-smart-wallet";

type AppContextData = {
    value: EVMSmartWallet | undefined;
    setValue: (value: EVMSmartWallet | undefined) => void;
    isAuthenticated: boolean | null;
    setIsAuthenticated: (value: boolean | null) => void;
    transferSuccess: boolean;
    setTransferSuccess: (value: boolean) => void;
    soldNft: boolean;
    setSoldNft: (value: boolean) => void;
    isProd: boolean;
    setIsProd: (value: boolean) => void;
};

const AppContext = createContext<AppContextData>({
    value: undefined,
    setValue: (value) => console.warn("no provider for setValue:", value),
    isAuthenticated: null,
    setIsAuthenticated: (value) => console.warn("no provider for setIsAuthenticated:", value),
    transferSuccess: false,
    setTransferSuccess: (value) => console.warn("no provider for setTransferSuccess:", value),
    soldNft: false,
    setSoldNft: (value) => console.warn("no provider for setSoldNft:", value),
    isProd: false,
    setIsProd: (value) => console.warn("no value for setIsProd:", value),
});

const AppProvider = ({ children }: { children: JSX.Element }) => {
    const [value, setValue] = useState<EVMSmartWallet | undefined>(undefined);
    const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
    const [transferSuccess, setTransferSuccess] = useState(false);
    const [soldNft, setSoldNft] = useState(false);
    const [isProd, setIsProd] = useState(false);

    useEffect(() => {
        // Initialize authentication from local storage
        const isUserConnected = localStorage.getItem("isUserConnected");
        if (isUserConnected === "true") {
            setIsAuthenticated(true);
        } else {
            setIsAuthenticated(false);
        }
    }, [value]);

    const contextValue: AppContextData = {
        value,
        setValue,
        isAuthenticated,
        setIsAuthenticated,
        transferSuccess,
        setTransferSuccess,
        soldNft,
        setSoldNft,
        isProd,
        setIsProd,
    };

    return <AppContext.Provider value={contextValue}>{children}</AppContext.Provider>;
};

export { AppContext, AppProvider };
