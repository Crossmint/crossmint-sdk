import { createContext, useEffect, useMemo, useState } from "react";

import { AuthProvider, useAuth as useAuthCore } from "@crossmint/client-sdk-auth-core";
import type { AuthProviderParams } from "@crossmint/client-sdk-auth-core/src/contexts/authlogin";
import { EVMSmartWallet, SmartWalletSDK } from "@crossmint/client-sdk-smart-wallet";

export const WalletContext = createContext<{ wallet: EVMSmartWallet | null; isLoadingWallet: boolean }>({
    wallet: null,
    isLoadingWallet: false,
});

export function CrossmintAuthProvider(props: AuthProviderParams) {
    return (
        <AuthProvider {...props}>
            <AuthWalletProvider {...props}></AuthWalletProvider>
        </AuthProvider>
    );
}

function AuthWalletProvider(props: AuthProviderParams) {
    const { jwt } = useAuthCore();

    const [wallet, setWallet] = useState<EVMSmartWallet | null>(null);
    const [isLoadingWallet, setIsLoadingWallet] = useState<boolean>(false);

    const smartWalletSDK = useMemo(() => SmartWalletSDK.init({ clientApiKey: props.apiKey }), undefined);

    const createWallet = async (jwt: string) => {
        setIsLoadingWallet(true);

        try {
            const wallet = await smartWalletSDK.getOrCreateWallet({ jwt }, props.embeddedWallets.defaultChain);
            setWallet(wallet);
        } catch (e: any) {
            console.log("There was an error creating a wallet ", e);
            throw e;
        } finally {
            setIsLoadingWallet(false);
        }
    };

    useEffect(() => {
        if (props.embeddedWallets.createOnLogin && !wallet && jwt) {
            console.log("Creating wallet");
            createWallet(jwt);
        }

        if (wallet && !jwt) {
            // implies a logout has occurred, clear wallet
            console.log("Clearing wallet");
            setWallet(null);
        }
    }, [jwt, props.embeddedWallets.createOnLogin, wallet]);

    return <WalletContext.Provider value={{ wallet, isLoadingWallet }}>{props.children}</WalletContext.Provider>;
}
