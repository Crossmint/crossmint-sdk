import { type ReactNode, useEffect } from "react";
import { useCrossmint } from "@crossmint/client-sdk-react-base";

import type { CrossmintAuthProviderProps } from "@/types/auth";
import { useAuth } from "@/hooks";
import { CrossmintAuthProviderInternal } from "./CrossmintAuthProviderInternal";

function CrossmintAuthSync({ children }: { children: ReactNode }) {
    const { experimental_setCustomAuth } = useCrossmint();
    const { user, jwt, experimental_externalWalletSigner } = useAuth();

    useEffect(() => {
        if ((experimental_externalWalletSigner != null || user?.email != null) && jwt != null) {
            experimental_setCustomAuth({
                jwt,
                email: user?.email,
                externalWalletSigner: experimental_externalWalletSigner,
            });
        }
    }, [experimental_externalWalletSigner, jwt, user]);

    return children;
}

export function CrossmintAuthProvider({ children, ...props }: CrossmintAuthProviderProps) {
    return (
        <CrossmintAuthProviderInternal {...props}>
            <CrossmintAuthSync>{children}</CrossmintAuthSync>
        </CrossmintAuthProviderInternal>
    );
}
