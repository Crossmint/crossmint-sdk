import { useCrossmint } from "@/hooks";
import { ReactNode } from "react";

import { AuthProvider as AuthCoreProvider } from "@crossmint/client-sdk-auth-core/client";

import { CrossmintWalletConfig, CrossmintWalletProvider } from "./CrossmintWalletProvider";

export function CrossmintAuthProvider({
    embeddedWallets,
    children,
}: {
    embeddedWallets: CrossmintWalletConfig;
    children: ReactNode;
}) {
    const { crossmint, setJwt } = useCrossmint("CrossmintAuthProvider must be used within CrossmintProvider");

    return (
        <AuthCoreProvider setJwtToken={setJwt} crossmint={crossmint}>
            <CrossmintWalletProvider config={embeddedWallets}>{children}</CrossmintWalletProvider>
        </AuthCoreProvider>
    );
}
