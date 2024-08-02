import { User } from "firebase/auth";
import { createContext, useEffect, useState } from "react";

import { EVMSmartWallet } from "@crossmint/client-sdk-smart-wallet";

import { GoogleAuthProvider, auth, onAuthStateChanged, signInWithPopup, signOut } from "../../lib/firebase";

type AppContextData = {
    setSmartWallet: (value: EVMSmartWallet | undefined) => void;
    isAuthenticated: boolean | null;
    setIsAuthenticated: (value: boolean | null) => void;
    signInWithGoogle: () => Promise<void>;
    signOutUser: () => void;
    smartWallet: EVMSmartWallet | undefined;
    authedUser: User | undefined;
};

const AppContext = createContext<AppContextData>({
    setSmartWallet: (value) => console.warn("no provider for setValue:", value),
    isAuthenticated: null,
    setIsAuthenticated: (value) => console.warn("no provider for setIsAuthenticated:", value),
    signInWithGoogle: async () => console.warn("no provider for signInWithGoogle"),
    signOutUser: () => console.warn("no provider for signOutUser"),
    smartWallet: undefined,
    authedUser: undefined,
});

const AppProvider = ({ children }: { children: JSX.Element }) => {
    const [smartWallet, setSmartWallet] = useState<EVMSmartWallet | undefined>(undefined);
    const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
    const [authedUser, setAuthedUser] = useState<any>(null);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (user) => {
            setAuthedUser(user ?? null);
            setIsAuthenticated(!!user);
        });
        return () => unsubscribe();
    }, []);

    const signInWithGoogle = async () => {
        try {
            const provider = new GoogleAuthProvider();
            await signInWithPopup(auth, provider);
        } catch (error) {
            console.error("Error signing in with Google:", error);
        }
    };

    const signOutUser = async () => {
        try {
            await signOut(auth);
            setIsAuthenticated(false);
            setSmartWallet(undefined);
        } catch (error) {
            console.error("Error signing out:", error);
        }
    };

    const contextValue: AppContextData = {
        smartWallet,
        setSmartWallet,
        isAuthenticated,
        setIsAuthenticated,
        signInWithGoogle,
        signOutUser,
        authedUser,
    };

    return <AppContext.Provider value={contextValue}>{children}</AppContext.Provider>;
};

export { AppContext, AppProvider };
