import { useContext } from "react";
import type { CrossmintAuthBaseContextType } from "@crossmint/client-sdk-react-base";
import type { AuthMaterialWithUser, OAuthProvider } from "@crossmint/common-sdk-auth";
import { AuthContext } from "@/providers/CrossmintAuthProvider";

interface RNCrossmintAuthContext extends CrossmintAuthBaseContextType {
    loginWithOAuth: (provider: OAuthProvider) => Promise<void>;
    createAuthSession: (urlOrOneTimeSecret: string) => Promise<AuthMaterialWithUser | null>;
}

/**
 * Hook to access the Crossmint authentication context in React Native.
 *
 * Provides methods for login, logout, OAuth, and deep-link auth session creation.
 * Must be used within a {@link CrossmintAuthProvider}.
 *
 * @returns The authentication context including user state and auth methods.
 * @throws If used outside of a CrossmintAuthProvider.
 */
export function useCrossmintAuth(): RNCrossmintAuthContext {
    const context = useContext(AuthContext);
    if (context == null) {
        throw new Error("useCrossmintAuth must be used within a CrossmintAuthProvider");
    }
    return context;
}
