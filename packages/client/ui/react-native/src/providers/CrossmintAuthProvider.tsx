import { type ReactNode, useEffect } from "react";
import type { StorageProvider } from "@crossmint/client-sdk-auth";

import { useAuth, useCrossmint } from "../hooks";
import { CrossmintAuthProviderInternal } from "./CrossmintAuthProviderInternal";

export type CrossmintAuthProviderProps = {
    prefetchOAuthUrls?: boolean;
    onLoginSuccess?: () => void;
    authModalTitle?: string;
    children: ReactNode;
    refreshRoute?: string;
    logoutRoute?: string;
    customStorageProvider?: StorageProvider;
    appSchema?: string | string[];
};

function CrossmintAuthSync({ children }: { children: ReactNode }) {
    const { experimental_setCustomAuth, experimental_customAuth } = useCrossmint();
    const { user, jwt } = useAuth();

    useEffect(() => {
        // Logout state
        if (jwt == null && experimental_customAuth?.jwt != null) {
            experimental_setCustomAuth(undefined);
        }
        // Login state
        if (jwt != null) {
            experimental_setCustomAuth({
                jwt,
                email: user?.email,
            });
        }
    }, [experimental_setCustomAuth, jwt, user]);

    return children;
}

export function CrossmintAuthProvider({ children, ...props }: CrossmintAuthProviderProps) {
    return (
        <CrossmintAuthProviderInternal {...props}>
            <CrossmintAuthSync>{children}</CrossmintAuthSync>
        </CrossmintAuthProviderInternal>
    );
}
