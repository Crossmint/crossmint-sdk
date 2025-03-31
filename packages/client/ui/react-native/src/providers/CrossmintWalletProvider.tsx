import { type ReactNode, useMemo } from "react";
import { CrossmintWallets } from "@crossmint/wallets-sdk";
import { WalletContext, useWalletState } from "@crossmint/client-sdk-react-base";

import { useCrossmint } from "@/hooks";
import { useCrossmintMobile } from "@/hooks/useCrossmint";

export function CrossmintWalletProvider({
    children,
}: {
    children: ReactNode;
}) {
    const { crossmint } = useCrossmint("CrossmintWalletProvider must be used within CrossmintProvider");
    const { appId } = useCrossmintMobile("CrossmintWalletProvider must be used within CrossmintProvider");
    const smartWalletSDK = useMemo(() => CrossmintWallets.from(crossmint, { appId }), [crossmint, appId]);

    const {
        state: walletState,
        getOrCreateWallet,
        clearWallet,
    } = useWalletState({
        crossmintWallets: smartWalletSDK,
        crossmintJwt: crossmint.jwt ?? null,
    });

    return (
        <WalletContext.Provider
            value={{
                ...walletState,
                getOrCreateWallet,
                clearWallet,
            }}
        >
            {children}
        </WalletContext.Provider>
    );
}
