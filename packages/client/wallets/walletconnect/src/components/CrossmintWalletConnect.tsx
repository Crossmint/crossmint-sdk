import Loader from "@/components/common/Loader";
import { CrossmintWalletConnectLocale } from "@/i18n/dictionary";
import { CrossmintWalletConnectUIConfig } from "@/types/UIConfig";
import { CrossmintWalletConnectWallet } from "@/types/wallet";

import { CrossmintWalletConnectProvider } from "../hooks/useCrossmintWalletConnect";
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
