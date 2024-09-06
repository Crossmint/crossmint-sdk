import { type ReactNode, createContext, useEffect, useState } from "react";
import { createPortal } from "react-dom";

import type { EVMSmartWalletChain } from "@crossmint/client-sdk-smart-wallet";
import { type UIConfig, validateApiKeyAndGetCrossmintBaseUrl } from "@crossmint/common-sdk-base";

import AuthModal from "../components/auth/AuthModal";
import { useCrossmint, useWallet } from "../hooks";
import { SESSION_PREFIX } from "../utils";
import { CrossmintWalletProvider } from "./CrossmintWalletProvider";

export type CrossmintAuthWalletConfig = {
    defaultChain: EVMSmartWalletChain;
    createOnLogin: "all-users" | "off";
    type: "evm-smart-wallet";
};

export const AuthContext = createContext({
    login: () => {},
    logout: () => {},
    jwt: undefined as string | undefined,
});

export function CrossmintAuthProvider({
    embeddedWallets,
    children,
    appearance,
}: {
    embeddedWallets: CrossmintAuthWalletConfig;
    children: ReactNode;
    appearance?: UIConfig;
}) {
    const { crossmint, setJwt } = useCrossmint("CrossmintAuthProvider must be used within CrossmintProvider");
    const crossmintBaseUrl = validateApiKeyAndGetCrossmintBaseUrl(crossmint.apiKey);
    const [modalOpen, setModalOpen] = useState(false);

    const login = () => {
        if (crossmint.jwt) {
            console.log("User already logged in");
            return;
        }

        setModalOpen(true);
    };

    const logout = () => {
        document.cookie = `${SESSION_PREFIX}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
        setJwt(undefined);
    };

    useEffect(() => {
        if (crossmint.jwt == null) {
            return;
        }

        setModalOpen(false);
    }, [crossmint.jwt]);

    useEffect(() => {
        if (crossmint.jwt) {
            document.cookie = `${SESSION_PREFIX}=${crossmint.jwt}; path=/;SameSite=Lax;`;
        }
    }, [crossmint.jwt]);

    return (
        <AuthContext.Provider value={{ login, logout, jwt: crossmint.jwt }}>
            <CrossmintWalletProvider defaultChain={embeddedWallets.defaultChain}>
                <WalletManager embeddedWallets={embeddedWallets} accessToken={crossmint.jwt}>
                    {children}
                </WalletManager>
                {modalOpen
                    ? createPortal(
                          <AuthModal
                              baseUrl={crossmintBaseUrl}
                              setModalOpen={setModalOpen}
                              setJwtToken={setJwt}
                              apiKey={crossmint.apiKey}
                              appearance={appearance}
                          />,

                          document.body
                      )
                    : null}
            </CrossmintWalletProvider>
        </AuthContext.Provider>
    );
}

function WalletManager({
    embeddedWallets,
    children,
    accessToken,
}: {
    embeddedWallets: CrossmintAuthWalletConfig;
    children: ReactNode;
    accessToken: string | undefined;
}) {
    const { getOrCreateWallet, clearWallet, status } = useWallet();

    useEffect(() => {
        if (embeddedWallets.createOnLogin === "all-users" && status === "not-loaded" && accessToken != null) {
            getOrCreateWallet({
                type: embeddedWallets.type,
                signer: { type: "PASSKEY" },
            });
        }

        if (status === "loaded" && accessToken == null) {
            clearWallet();
        }
    }, [accessToken, status]);

    return <>{children}</>;
}
