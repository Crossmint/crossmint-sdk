import { useContext } from "react";
import type { CrossmintAuthBaseContextType } from "@crossmint/client-sdk-react-base";
import type { OAuthProvider } from "@crossmint/common-sdk-auth";
import { AuthContext } from "@/providers";

export interface CrossmintAuthContext extends CrossmintAuthBaseContextType {
    /** Initiate a login flow with the specified OAuth provider (e.g. "google", "twitter"). */
    loginWithOAuth: (provider: OAuthProvider) => Promise<void>;
}

/**
 * Access Crossmint authentication state and actions: `login`, `logout`, the current `user`, `jwt`, and auth `status`.
 * Must be used within a `CrossmintAuthProvider`.
 */
export function useCrossmintAuth(): CrossmintAuthContext {
    const context = useContext(AuthContext);
    if (context == null) {
        throw new Error("useCrossmintAuth must be used within a CrossmintAuthProvider");
    }
    return context;
}
