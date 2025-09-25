import type { ReactNode } from "react";
import type { CrossmintAuthBaseContextType, CrossmintAuthBaseProviderProps } from "@crossmint/client-sdk-react-base";
import type { AuthMaterialWithUser, OAuthProvider, SDKExternalUser } from "@crossmint/common-sdk-auth";

export interface RNAuthContext extends CrossmintAuthBaseContextType {
    user?: SDKExternalUser;
    loginWithOAuth: (provider: OAuthProvider) => Promise<void>;
    createAuthSession: (urlOrOneTimeSecret: string) => Promise<AuthMaterialWithUser | null>;
}

export interface RNCrossmintAuthProviderProps extends CrossmintAuthBaseProviderProps {
    prefetchOAuthUrls?: boolean;
    authModalTitle?: string;
    children: ReactNode;
    appSchema?: string | string[];
}
