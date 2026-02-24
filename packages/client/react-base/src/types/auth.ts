import type { ReactNode, MouseEvent } from "react";
import type { StorageProvider } from "@crossmint/client-sdk-auth";
import type { SDKExternalUser } from "@crossmint/common-sdk-auth";

export type AuthStatus = "logged-in" | "logged-out" | "in-progress" | "initializing";
export type LoginMethod = "email" | "google" | "farcaster" | "twitter" | "web3" | "web3:evm-only" | "web3:solana-only";

export type CrossmintAuthBaseContextType = {
    /** Trigger the login flow. Optionally pass a default email. */
    login: (defaultEmail?: string | MouseEvent) => void;
    /** Log the user out and clear the session. */
    logout: () => Promise<void>;
    /** Current JWT authentication token, if authenticated. */
    jwt?: string;
    /** The currently authenticated user object. */
    user?: SDKExternalUser;
    /** Authentication status: "logged-in" | "logged-out" | "in-progress" | "initializing". */
    status: AuthStatus;
    /** Configured login methods. */
    loginMethods?: LoginMethod[];
    /** Fetch and refresh the current authenticated user. */
    getUser: () => void;
    /** The underlying Crossmint auth client instance. */
    crossmintAuth?: any;
    /** External wallet signer for connecting third-party wallets to Crossmint auth. */
    experimental_externalWalletSigner?: any;
};

export type CrossmintAuthBaseProviderProps = {
    children: ReactNode;
    onLoginSuccess?: () => void;
    refreshRoute?: string;
    logoutRoute?: string;
    storageProvider?: StorageProvider;
};
