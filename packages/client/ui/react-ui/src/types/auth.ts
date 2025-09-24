import type { ReactNode } from "react";
import type { UIConfig } from "@crossmint/common-sdk-base";

export type {
    CrossmintAuthBaseProviderProps as BaseCrossmintAuthProviderProps,
    AuthStatus,
} from "@crossmint/client-sdk-react-base";

export type { BaseCrossmintWalletProviderProps } from "@crossmint/client-sdk-react-base";

export type OtpEmailPayload = {
    email: string;
    emailId: string;
};

export type LoginMethod = "email" | "google" | "farcaster" | "twitter" | "web3" | "web3:evm-only" | "web3:solana-only";

export type CrossmintAuthProviderProps = {
    appearance?: UIConfig;
    termsOfServiceText?: string | ReactNode;
    prefetchOAuthUrls?: boolean;
    onLoginSuccess?: () => void;
    authModalTitle?: string;
    children: ReactNode;
    loginMethods?: LoginMethod[];
    refreshRoute?: string;
    logoutRoute?: string;
};
