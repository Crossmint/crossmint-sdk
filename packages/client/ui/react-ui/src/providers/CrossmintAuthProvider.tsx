import { type ReactNode, useEffect } from "react";
import { useCrossmint } from "@crossmint/client-sdk-react-base";

import type { CrossmintAuthProviderProps } from "@/types/auth";
import { useAuth } from "@/hooks";
import { CrossmintAuthProviderInternal } from "./CrossmintAuthProviderInternal";

function CrossmintAuthSync({ children }: { children: ReactNode }) {
    const { experimental_setCustomAuth, experimental_customAuth } = useCrossmint();
    const { user, jwt, experimental_externalWalletSigner } = useAuth();

    useEffect(() => {
        if (jwt == null && experimental_customAuth?.jwt != null) {
            experimental_setCustomAuth(undefined);
        }
        if (experimental_externalWalletSigner != null || user?.email != null) {
            experimental_setCustomAuth({
                jwt,
                email: user?.email,
                externalWalletSigner: experimental_externalWalletSigner,
            });
        } else {
            experimental_setCustomAuth({ jwt });
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
