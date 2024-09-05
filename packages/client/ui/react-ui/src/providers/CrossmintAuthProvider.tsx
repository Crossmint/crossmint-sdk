import { type ReactNode, useEffect } from "react";

import { AuthProvider as AuthCoreProvider } from "@crossmint/client-sdk-auth-core/client";
import type { EVMSmartWalletChain, WalletParams } from "@crossmint/client-sdk-smart-wallet";
import type { UIConfig } from "@crossmint/common-sdk-base";

import { useCrossmint, useWallet } from "../hooks";
import { CrossmintWalletProvider } from "./CrossmintWalletProvider";

export type CrossmintAuthWalletConfig = {
    defaultChain: EVMSmartWalletChain;
    createOnLogin: "all-users" | "off";
    type: "evm-smart-wallet";
    config?: WalletParams;
};

export function CrossmintAuthProvider({
    embeddedWallets,
    children,
    appearance,
}: {
    embeddedWallets: CrossmintAuthWalletConfig;
    children: ReactNode;
    appearance?: UIConfig;
}) {
    const { crossmint, setJwt } = useCrossmint("CrossmintAuthProvider must be used within CrossmintProvider");

    return (
        <AuthCoreProvider setJwtToken={setJwt} crossmint={crossmint} appearance={appearance}>
            <CrossmintWalletProvider>
                <WalletManager embeddedWallets={embeddedWallets}>{children}</WalletManager>
            </CrossmintWalletProvider>
        </AuthCoreProvider>
    );
}

function WalletManager({
    embeddedWallets,
    children,
}: {
    embeddedWallets: CrossmintAuthWalletConfig;
    children: ReactNode;
}) {
    const { crossmint } = useCrossmint("CrossmintAuthProvider must be used within CrossmintProvider");
    const { getOrCreateWallet, clearWallet, status } = useWallet();

    useEffect(() => {
        if (embeddedWallets.createOnLogin === "all-users" && status === "not-loaded" && crossmint.jwt != null) {
            const config: WalletParams = embeddedWallets.config ?? { signer: { type: "PASSKEY" } };
            getOrCreateWallet({ jwt: crossmint.jwt }, embeddedWallets.defaultChain, {
                type: embeddedWallets.type,
                ...config,
            });
        }

        if (status === "loaded" && crossmint.jwt == null) {
            clearWallet();
        }
    }, [crossmint.jwt, status]);

    return <>{children}</>;
}
