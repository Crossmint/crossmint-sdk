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
    /** Custom UI configuration for the auth modal (colors, fonts, border radius). */
    appearance?: UIConfig;
    /** Custom title for the auth modal. */
    authModalTitle?: string;
    children: ReactNode;
    /** Login methods to enable (e.g. `["email", "google"]`). Defaults to `["email", "google"]`. */
    loginMethods?: LoginMethod[];
    /** Whether to prefetch OAuth provider URLs when the provider mounts. Defaults to `true`. */
    prefetchOAuthUrls?: boolean;
    /** Custom terms of service text shown in the auth modal. */
    termsOfServiceText?: string | ReactNode;
}
