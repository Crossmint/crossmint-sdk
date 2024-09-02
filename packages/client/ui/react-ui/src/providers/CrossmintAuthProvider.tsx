import { useCrossmint } from "@/hooks";
import { ReactNode } from "react";

import { AuthProvider as AuthCoreProvider } from "@crossmint/client-sdk-auth-core/client";

import { CrossmintWalletProvider } from "./CrossmintWalletProvider";

export type CrossmintAuthWalletConfig = {
    type: "evm-smart-wallet";
    defaultChain: "polygon-amoy" | "base-sepolia" | "optimism-sepolia" | "arbitrum-sepolia";
    createOnLogin: "all-users" | "off";
};

export function CrossmintAuthProvider({
    embeddedWallets,
    children,
}: {
    embeddedWallets: CrossmintAuthWalletConfig;
    children: ReactNode;
}) {
    const { crossmint, setJwt } = useCrossmint("CrossmintAuthProvider must be used within CrossmintProvider");

    return (
        <AuthCoreProvider setJwtToken={setJwt} crossmint={crossmint}>
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
