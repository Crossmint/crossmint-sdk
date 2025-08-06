import Loader from "@/components/common/Loader";
import type { CrossmintWalletConnectLocale } from "@/i18n/dictionary";
import type { CrossmintWalletConnectUIConfig } from "@/types/UIConfig";
import type { CrossmintWalletConnectWallet } from "@/types/wallet";
import { Toaster } from "react-hot-toast";

import { CrossmintWalletConnectProvider, useCrossmintWalletConnect } from "../hooks/useCrossmintWalletConnect";
import { useWalletConnectProvider } from "../hooks/useWalletConnectProvider";
import { useWalletConnectSessions } from "../hooks/useWalletConnectSessions";
import EnterURI from "./EnterURI/EnterURI";
import Sessions from "./Sessions/Sessions";
import RootLayout from "./common/layouts/RootLayout";
import ModalViewRouter from "./modals/ModalViewRouter";

export type CrossmintWalletConnectProps = {
    wcProjectId: string;
    wallets: CrossmintWalletConnectWallet[];
    uiConfig: CrossmintWalletConnectUIConfig;
    uri?: string;
    locale?: CrossmintWalletConnectLocale;
};

export function CrossmintWalletConnect(props: CrossmintWalletConnectProps) {
    return (
        <CrossmintWalletConnectProvider {...props}>
            <ToasterWrapper />
            <RootLayout>
                <ModalViewRouter />
                <_CrossmintWalletConnect {...props} />
            </RootLayout>
        </CrossmintWalletConnectProvider>
    );
}

function _CrossmintWalletConnect(props: CrossmintWalletConnectProps) {
    const { provider } = useWalletConnectProvider();
    const { sessions } = useWalletConnectSessions();

    if (!provider) {
        return <Loader />;
    }

    if (sessions.length > 0) {
        return <Sessions />;
    }

    return <EnterURI uri={props.uri} />;
}

function ToasterWrapper() {
    const { uiConfig } = useCrossmintWalletConnect();

    return (
        <Toaster
            toastOptions={{
                style: {
                    backgroundColor: uiConfig.colors.backgroundSecondary,
                    color: uiConfig.colors.textPrimary,
                    overflowWrap: "anywhere",
                },
                error: {
                    iconTheme: {
                        primary: uiConfig.colors.danger,
                        secondary: uiConfig.colors.backgroundSecondary,
                    },
                },
            }}
        />
    );
}
