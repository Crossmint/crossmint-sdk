import { AuthModal } from "@/components";
import { useCrossmint } from "@/hooks";
import { CrossmintAuthService } from "@/services/CrossmintAuthService";
import { SESSION_PREFIX } from "@/utils";
import { type ReactNode, createContext, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";

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
    const [modalOpen, setModalOpen] = useState(false);

    const crossmintService = useMemo(
        () => new CrossmintAuthService(crossmint.apiKey),
        [crossmint.apiKey, crossmint.jwt]
    );

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
                              baseUrl={crossmintService.crossmintBaseUrl}
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
