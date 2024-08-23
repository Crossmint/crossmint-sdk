import { useCrossmint } from "@/hooks";
import { ReactNode, createContext, useEffect, useMemo, useState } from "react";

import { AuthProvider } from "@crossmint/client-sdk-auth-core/client";
import { EVMSmartWallet, SmartWalletSDK } from "@crossmint/client-sdk-smart-wallet";
import { Crossmint } from "@crossmint/common-sdk-base";

type AuthWalletProviderParams = {
    embeddedWallets: {
        type: "evm-smart-wallet";
        defaultChain: "polygon-amoy" | "base-sepolia";
        createOnLogin: "all-users" | "off";
    };
    children: ReactNode;
};

export const WalletContext = createContext<{ wallet: EVMSmartWallet | null }>({
    wallet: null,
});

export function CrossmintAuthProvider({ embeddedWallets, children }: AuthWalletProviderParams) {
    const { crossmint, setJwt } = useCrossmint();

    return (
        <AuthProvider setJwtToken={setJwt} crossmint={crossmint}>
            <AuthWalletProvider crossmint={crossmint} embeddedWallets={embeddedWallets}>
                {children}
            </AuthWalletProvider>
        </AuthProvider>
    );
}

function AuthWalletProvider({
    crossmint,
    children,
    embeddedWallets,
}: AuthWalletProviderParams & { crossmint: Crossmint }) {
    const [wallet, setWallet] = useState<EVMSmartWallet | null>(null);

    const smartWalletSDK = useMemo(() => SmartWalletSDK.init({ clientApiKey: crossmint.apiKey }), [crossmint.apiKey]);

    const getOrCreateWallet = async (jwt: string) => {
        try {
            const wallet = await smartWalletSDK.getOrCreateWallet({ jwt }, embeddedWallets.defaultChain);
            setWallet(wallet);
        } catch (e: any) {
            console.error("There was an error creating a wallet ", e);
            throw e;
        }
    };

    useEffect(() => {
        if (embeddedWallets.createOnLogin && crossmint.jwt) {
            console.log("Getting or Creating wallet");
            getOrCreateWallet(crossmint.jwt);
        }

        if (wallet && !crossmint.jwt) {
            // implies a logout has occurred, clear wallet
            console.log("Clearing wallet");
            setWallet(null);
        }
    }, [crossmint.jwt, embeddedWallets.createOnLogin]);

    return <WalletContext.Provider value={{ wallet }}>{children}</WalletContext.Provider>;
}
