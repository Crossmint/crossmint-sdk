import type { CoreTypes } from "@walletconnect/types";
import type { IWeb3Wallet } from "@walletconnect/web3wallet";
import { type ReactNode, createContext, useContext, useEffect, useState } from "react";

import { createProvider } from "../utils/walletconnect/createProvider";

export type WalletConnectProviderContext = {
    provider?: IWeb3Wallet;
};

export const WalletConnectProviderContext = createContext<WalletConnectProviderContext>({
    provider: undefined,
});

export type WalletConnectConfig = {
    projectId: string;
    metadata: CoreTypes.Metadata;
};

export function WalletConnectProviderProvider({
    walletConnectConfig,
    children,
}: {
    walletConnectConfig: WalletConnectConfig;
    children: ReactNode;
}) {
    const [provider, setProvider] = useState<IWeb3Wallet | undefined>(undefined);

    useEffect(() => {
        createProvider(walletConnectConfig).then((provider) => {
            console.log("[WalletConnectProviderProvider] Provider created:", provider);
            setProvider(provider);
        });
    }, [walletConnectConfig]);

    return (
        <WalletConnectProviderContext.Provider value={{ provider }}>{children}</WalletConnectProviderContext.Provider>
    );
}

export function useWalletConnectProvider() {
    return useContext(WalletConnectProviderContext);
}
