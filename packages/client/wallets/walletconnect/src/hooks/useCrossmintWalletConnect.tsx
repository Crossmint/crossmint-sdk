import {
    type CrossmintWalletConnectDictionary,
    type CrossmintWalletConnectLocale,
    getDictionary,
} from "@/i18n/dictionary";
import type { CrossmintWalletConnectRequiredUIConfig } from "@/types/UIConfig";
import { type ReactNode, createContext, useContext } from "react";

import type { CrossmintWalletConnectProps } from "../components/CrossmintWalletConnect";
import { PairWithURIProvider } from "./usePairWithURI";
import { WalletConnectProviderProvider } from "./useWalletConnectProvider";
import { WalletConnectRequestsContextProvider } from "./useWalletConnectRequests";
import { WalletConnectSessionsContextProvider } from "./useWalletConnectSessions";
import { WalletConnectWalletsContextProvider } from "./useWalletConnectWallets";

type CrossmintWalletConnectContext = {
    uiConfig: CrossmintWalletConnectRequiredUIConfig;
    locale: CrossmintWalletConnectLocale;
    dictionary: CrossmintWalletConnectDictionary;
};

const DEFAULT_UI_CONFIG: CrossmintWalletConnectRequiredUIConfig = {
    colors: {
        textPrimary: "#00150d",
        textSecondary: "#67797f",
        textLink: "#478fec",
        textAccentButton: "#ffffff",
        background: "#f2f3f7",
        backgroundSecondary: "#ffffff",
        border: "#d0d5dd",
        accent: "#04aa6d",
        danger: "#ff4d4f",
    },
    metadata: {
        name: "Crossmint",
        description: "Crossmint Wallet",
        url: "https://crossmint.com",
        icon: "https://crossmint.com/favicon.ico",
    },
};

const CrossmintWalletConnectContext = createContext<CrossmintWalletConnectContext>({
    uiConfig: DEFAULT_UI_CONFIG,
    locale: "en-US",
    dictionary: getDictionary("en-US"),
});

export function CrossmintWalletConnectProvider({
    children,
    ...props
}: CrossmintWalletConnectProps & { children: ReactNode }) {
    const locale = props.locale || "en-US";

    return (
        <CrossmintWalletConnectContext.Provider
            value={{
                uiConfig: {
                    ...DEFAULT_UI_CONFIG,
                    colors: { ...DEFAULT_UI_CONFIG.colors, ...props.uiConfig.colors },
                    metadata: { ...DEFAULT_UI_CONFIG.metadata, ...props.uiConfig.metadata },
                },
                locale,
                dictionary: getDictionary(locale),
            }}
        >
            <WalletConnectProviderProvider
                walletConnectConfig={{
                    projectId: props.wcProjectId,
                    metadata: { ...props.uiConfig.metadata, icons: [props.uiConfig.metadata.icon] },
                }}
            >
                <PairWithURIProvider>
                    <WalletConnectWalletsContextProvider wallets={props.wallets}>
                        <WalletConnectSessionsContextProvider>
                            <WalletConnectRequestsContextProvider>{children}</WalletConnectRequestsContextProvider>
                        </WalletConnectSessionsContextProvider>
                    </WalletConnectWalletsContextProvider>
                </PairWithURIProvider>
            </WalletConnectProviderProvider>
        </CrossmintWalletConnectContext.Provider>
    );
}

export function useCrossmintWalletConnect() {
    return useContext(CrossmintWalletConnectContext);
}
