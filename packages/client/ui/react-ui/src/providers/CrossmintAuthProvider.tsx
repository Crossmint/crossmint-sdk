import { createContext, useEffect, useMemo, useState } from "react";

import { AuthProvider, type AuthProviderParams, useAuth as useAuthCore } from "@crossmint/client-sdk-auth-core";
import { EVMSmartWallet, SmartWalletSDK } from "@crossmint/client-sdk-smart-wallet";

type AuthWalletProviderParams = AuthProviderParams & {
    embeddedWallets: {
        type: "evm-smart-wallet";
        defaultChain: "polygon-amoy" | "base-sepolia";
        createOnLogin: "all-users" | "off";
    };
};

export const WalletContext = createContext<{ wallet: EVMSmartWallet | null }>({
    wallet: null,
});

export function CrossmintAuthProvider(props: AuthWalletProviderParams) {
    return (
        <AuthProvider {...props}>
            <AuthWalletProvider {...props}></AuthWalletProvider>
        </AuthProvider>
    );
}

function AuthWalletProvider(props: AuthWalletProviderParams) {
    const { jwt } = useAuthCore();

    const [wallet, setWallet] = useState<EVMSmartWallet | null>(null);

    const smartWalletSDK = useMemo(() => SmartWalletSDK.init({ clientApiKey: props.apiKey }), [props.apiKey]);

    const createWallet = async (jwt: string) => {
        try {
            const wallet = await smartWalletSDK.getOrCreateWallet({ jwt }, props.embeddedWallets.defaultChain);
            setWallet(wallet);
        } catch (e: any) {
            console.error("There was an error creating a wallet ", e);
            throw e;
        }
    };

    useEffect(() => {
        if (props.embeddedWallets.createOnLogin && jwt) {
            console.log("Creating wallet");
            createWallet(jwt);
        }

        if (wallet && !jwt) {
            // implies a logout has occurred, clear wallet
            console.log("Clearing wallet");
            setWallet(null);
        }
    }, [jwt, props.embeddedWallets.createOnLogin]);

    return <WalletContext.Provider value={{ wallet }}>{props.children}</WalletContext.Provider>;
}
