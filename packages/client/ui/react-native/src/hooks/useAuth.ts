import { useContext } from "react";
import type { CrossmintAuthBaseContextType } from "@crossmint/client-sdk-react-base";
import type { AuthMaterialWithUser, OAuthProvider } from "@crossmint/common-sdk-auth";
import { AuthContext } from "@/providers/CrossmintAuthProvider";

interface RNCrossmintAuthContext extends CrossmintAuthBaseContextType {
    loginWithOAuth: (provider: OAuthProvider) => Promise<void>;
    createAuthSession: (urlOrOneTimeSecret: string) => Promise<AuthMaterialWithUser | null>;
}

/**
 * Access Crossmint authentication state and actions: `loginWithOAuth`, `logout`, the current `user`, `jwt`, and auth `status`.
 * Must be used within a `CrossmintAuthProvider`.
 */
export function useCrossmintAuth(): RNCrossmintAuthContext {
    const context = useContext(AuthContext);
    if (context == null) {
        throw new Error("useCrossmintAuth must be used within a CrossmintAuthProvider");
    }
    return context;
}
