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
    const { crossmint, setJwt } = useCrossmint();
    const { jwt } = useAuth();

    useEffect(() => {
        if (jwt == null && crossmint.jwt != null) {
            setJwt(undefined);
        }
        if (jwt != null) {
            setJwt(jwt);
        }
    }, [setJwt, jwt, crossmint]);

    return children;
}

export function CrossmintAuthProvider({ children, ...props }: CrossmintAuthProviderProps) {
    return (
        <CrossmintAuthProviderInternal {...props}>
            <CrossmintAuthSync>{children}</CrossmintAuthSync>
        </CrossmintAuthProviderInternal>
    );
}
