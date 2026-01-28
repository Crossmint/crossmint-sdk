import type { ReactNode, MouseEvent } from "react";
import type { StorageProvider } from "@crossmint/client-sdk-auth";
import type { SDKExternalUser } from "@crossmint/common-sdk-auth";

export type AuthStatus = "logged-in" | "logged-out" | "in-progress" | "initializing";
export type LoginMethod = "email" | "google" | "farcaster" | "twitter" | "web3" | "web3:evm-only" | "web3:solana-only";

export type CrossmintAuthBaseContextType = {
    crossmintAuth?: any;
    login: (defaultEmail?: string | MouseEvent) => void;
    logout: () => Promise<void>;
    jwt?: string;
    user?: SDKExternalUser;
    status: AuthStatus;
    getUser: () => void;
    experimental_externalWalletSigner?: any;
    loginMethods?: LoginMethod[];
};

export type CrossmintAuthBaseProviderProps = {
    children: ReactNode;
    onLoginSuccess?: () => void;
    refreshRoute?: string;
    logoutRoute?: string;
    storageProvider?: StorageProvider;
};
