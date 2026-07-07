import type { ReactNode } from "react";
import type { CrossmintAuthBaseContextType, CrossmintAuthBaseProviderProps } from "@crossmint/client-sdk-react-base";
import type { AuthMaterialWithUser, OAuthProvider, SDKExternalUser } from "@crossmint/common-sdk-auth";

export interface RNAuthContext extends CrossmintAuthBaseContextType {
    /** The currently authenticated user, if any. */
    user?: SDKExternalUser;
    /** Initiate a login flow with the specified OAuth provider (e.g. "google", "twitter"). */
    loginWithOAuth: (provider: OAuthProvider) => Promise<void>;
    /** Complete authentication from an OAuth callback URL or one-time secret (e.g. from a deep link). */
    createAuthSession: (urlOrOneTimeSecret: string) => Promise<AuthMaterialWithUser | null>;
}

export interface RNCrossmintAuthProviderProps extends CrossmintAuthBaseProviderProps {
    /** Whether to prefetch OAuth provider URLs when the provider mounts. */
    prefetchOAuthUrls?: boolean;
    /** Custom title for the auth modal. */
    authModalTitle?: string;
    children: ReactNode;
    /** Your app's deep link scheme(s) (e.g. `"myapp://"`), used for OAuth redirects back into your app. */
    appSchema?: string | string[];
}
