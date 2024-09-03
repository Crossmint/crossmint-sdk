import { useCrossmint } from "@/hooks";
import type { ReactNode } from "react";

import { AuthProvider as AuthCoreProvider } from "@crossmint/client-sdk-auth-core/client";
import { EVMSmartWalletChain } from "@crossmint/client-sdk-smart-wallet";
import type { UIConfig } from "@crossmint/common-sdk-base";

import { CrossmintWalletProvider } from "./CrossmintWalletProvider";

export type CrossmintAuthWalletConfig = {
    type: "evm-smart-wallet";
    defaultChain: EVMSmartWalletChain;
    createOnLogin: "all-users" | "off";
};

export function CrossmintAuthProvider({
    embeddedWallets,
    children,
    appearance,
}: {
    embeddedWallets: CrossmintAuthWalletConfig;
    children: ReactNode;
    appearance: UIConfig;
}) {
    const { crossmint, setJwt } = useCrossmint("CrossmintAuthProvider must be used within CrossmintProvider");

    return (
        <AuthCoreProvider setJwtToken={setJwt} crossmint={crossmint} appearance={appearance}>
            <CrossmintWalletProvider
                walletConfig={{ type: "evm-smart-wallet", signer: { type: "PASSKEY" } }}
                defaultChain={embeddedWallets.defaultChain}
                createOnInit={embeddedWallets.createOnLogin}
            >
                {children}
            </CrossmintWalletProvider>
        </AuthCoreProvider>
    );
}
