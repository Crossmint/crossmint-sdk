import type { ReactNode } from "react";
import type { UIConfig } from "@crossmint/common-sdk-base";
import type { CrossmintAuthBaseContextType } from "@crossmint/client-sdk-react-base";

export type {
    CrossmintAuthBaseProviderProps as BaseCrossmintAuthProviderProps,
    AuthStatus,
} from "@crossmint/client-sdk-react-base";

export type { BaseCrossmintWalletProviderProps } from "@crossmint/client-sdk-react-base";

export type OtpEmailPayload = {
    email: string;
    emailId: string;
};

export interface CrossmintAuthProviderProps extends CrossmintAuthBaseContextType {
    appearance?: UIConfig;
    authModalTitle?: string;
    children?: ReactNode;
    logoutRoute?: string;
    onLoginSuccess?: () => void;
    prefetchOAuthUrls?: boolean;
    refreshRoute?: string;
    termsOfServiceText?: string | ReactNode;
}
