import AuthModal from "@/components/auth/AuthModal";
import { useCrossmint } from "@/hooks";
import { SESSION_PREFIX } from "@/utils";
import { type ReactNode, createContext, useEffect, useState } from "react";
import { createPortal } from "react-dom";

import { validateApiKeyAndGetCrossmintBaseUrl } from "@crossmint/client-sdk-base";
import type { UIConfig } from "@crossmint/common-sdk-base";

import { type CrossmintWalletConfig, CrossmintWalletProvider } from "./CrossmintWalletProvider";

type CrossmintAuthProviderProps = {
    embeddedWallets: CrossmintWalletConfig;
    children: ReactNode;
    appearance?: UIConfig;
};

export const AuthContext = createContext({
    login: () => {},
    logout: () => {},
    jwt: undefined as string | undefined,
});

export function CrossmintAuthProvider({ embeddedWallets, children, appearance }: CrossmintAuthProviderProps) {
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

    useEffect(() => {
        if (crossmint.jwt == null) {
            return;
        }

        setModalOpen(false);
    }, [crossmint.jwt]);

    const logout = () => {
        document.cookie = `${SESSION_PREFIX}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
        setJwt(undefined);
    };

    useEffect(() => {
        if (crossmint.jwt) {
            document.cookie = `${SESSION_PREFIX}=${crossmint.jwt}; path=/;SameSite=Lax;`;
        }
    }, [crossmint.jwt]);

    return (
        <AuthContext.Provider value={{ login, logout, jwt: crossmint.jwt }}>
            <CrossmintWalletProvider config={embeddedWallets}>
                {children}
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
