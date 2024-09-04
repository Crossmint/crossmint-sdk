import { useCrossmint } from "@/hooks";
import type { ReactNode } from "react";

import { AuthProvider as AuthCoreProvider } from "@crossmint/client-sdk-auth-core/client";
import type { UIConfig } from "@crossmint/common-sdk-base";

import { type CrossmintWalletConfig, CrossmintWalletProvider } from "./CrossmintWalletProvider";

type CrossmintAuthProviderProps = {
    embeddedWallets: CrossmintWalletConfig;
    children: ReactNode;
    appearance?: UIConfig;
};

export function CrossmintAuthProvider({ embeddedWallets, children, appearance }: CrossmintAuthProviderProps) {
    const { crossmint, setJwt } = useCrossmint("CrossmintAuthProvider must be used within CrossmintProvider");

    return (
        <AuthCoreProvider setJwtToken={setJwt} crossmint={crossmint} appearance={appearance}>
            <CrossmintWalletProvider config={embeddedWallets}>{children}</CrossmintWalletProvider>
        </AuthCoreProvider>
    );
}
