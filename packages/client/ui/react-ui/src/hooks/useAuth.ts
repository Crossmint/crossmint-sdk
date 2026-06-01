import { useContext } from "react";
import type { CrossmintAuthBaseContextType } from "@crossmint/client-sdk-react-base";
import type { OAuthProvider } from "@crossmint/common-sdk-auth";
import { AuthContext } from "@/providers";

export interface CrossmintAuthContext extends CrossmintAuthBaseContextType {
    loginWithOAuth: (provider: OAuthProvider) => Promise<void>;
}

/**
 * Hook to access the Crossmint authentication context.
 *
 * Provides methods for login, logout, and accessing the current user session.
 * Must be used within a {@link CrossmintAuthProvider}.
 *
 * @returns The authentication context including user state and auth methods.
 * @throws If used outside of a CrossmintAuthProvider.
 */
export function useCrossmintAuth(): CrossmintAuthContext {
    const context = useContext(AuthContext);
    if (context == null) {
        throw new Error("useCrossmintAuth must be used within a CrossmintAuthProvider");
    }
    return context;
}
