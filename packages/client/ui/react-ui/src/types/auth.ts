import type { ReactNode } from "react";
import type { UIConfig } from "@crossmint/common-sdk-base";
import type { CrossmintAuthBaseProviderProps, LoginMethod } from "@crossmint/client-sdk-react-base";

export type {
    CrossmintAuthBaseProviderProps as BaseCrossmintAuthProviderProps,
    AuthStatus,
} from "@crossmint/client-sdk-react-base";

export type { BaseCrossmintWalletProviderProps } from "@crossmint/client-sdk-react-base";

export type OtpEmailPayload = {
    email: string;
    emailId: string;
};

export interface CrossmintAuthProviderProps extends CrossmintAuthBaseProviderProps {
    appearance?: UIConfig;
    authModalTitle?: string;
    children: ReactNode;
    loginMethods?: LoginMethod[];
    prefetchOAuthUrls?: boolean;
    termsOfServiceText?: string | ReactNode;
}
