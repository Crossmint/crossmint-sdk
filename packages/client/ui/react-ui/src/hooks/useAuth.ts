import { useContext } from "react";
import type { CrossmintAuthBaseContextType } from "@crossmint/client-sdk-react-base";
import type { OAuthProvider } from "@crossmint/common-sdk-auth";
import { AuthContext } from "@/providers";

export interface CrossmintAuthContext extends CrossmintAuthBaseContextType {
    experimental_loginWithOAuth: (provider: OAuthProvider) => Promise<void>;
}

export function useCrossmintAuth(): CrossmintAuthContext {
    const context = useContext(AuthContext);
    if (context == null) {
        throw new Error("useCrossmintAuth must be used within a CrossmintAuthProvider");
    }
    return context;
}

export const useAuth = useCrossmintAuth;
