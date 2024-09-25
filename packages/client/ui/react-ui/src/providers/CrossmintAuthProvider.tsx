import { REFRESH_TOKEN_PREFIX, SESSION_PREFIX, deleteCookie, getCookie, setCookie } from "@/utils/authCookies";
import { type ReactNode, createContext, useEffect, useState } from "react";
import { createPortal } from "react-dom";

import { CrossmintAuthService } from "@crossmint/client-sdk-auth-core/client";
import type { EVMSmartWalletChain } from "@crossmint/client-sdk-smart-wallet";
import { type UIConfig, validateApiKeyAndGetCrossmintBaseUrl } from "@crossmint/common-sdk-base";

import AuthModal from "../components/auth/AuthModal";
import { type AuthMaterial, useCrossmint, useRefreshToken, useWallet } from "../hooks";
import { CrossmintWalletProvider } from "./CrossmintWalletProvider";

export type CrossmintAuthWalletConfig = {
    defaultChain: EVMSmartWalletChain;
    createOnLogin: "all-users" | "off";
    type: "evm-smart-wallet";
    showWalletModals?: boolean;
};

export type CrossmintAuthProviderProps = {
    embeddedWallets: CrossmintAuthWalletConfig;
    appearance?: UIConfig;
    children: ReactNode;
};

type AuthStatus = "logged-in" | "logged-out" | "in-progress";

type AuthContextType = {
    login: () => void;
    logout: () => void;
    jwt?: string;
    refreshToken?: string;
    status: AuthStatus;
};

export const AuthContext = createContext<AuthContextType>({
    login: () => {},
    logout: () => {},
    status: "logged-out",
});

export function CrossmintAuthProvider({ embeddedWallets, children, appearance }: CrossmintAuthProviderProps) {
    const { crossmint, setJwt, setRefreshToken } = useCrossmint(
        "CrossmintAuthProvider must be used within CrossmintProvider"
    );
    const crossmintAuthService = new CrossmintAuthService(crossmint.apiKey);
    const crossmintBaseUrl = validateApiKeyAndGetCrossmintBaseUrl(crossmint.apiKey);
    const [modalOpen, setModalOpen] = useState(false);

    const setAuthMaterial = (authMaterial: AuthMaterial) => {
        setCookie(SESSION_PREFIX, authMaterial.jwtToken);
        setCookie(REFRESH_TOKEN_PREFIX, authMaterial.refreshToken.secret, authMaterial.refreshToken.expiresAt);
        setJwt(authMaterial.jwtToken);
        setRefreshToken(authMaterial.refreshToken.secret);
    };

    const logout = () => {
        deleteCookie(SESSION_PREFIX);
        deleteCookie(REFRESH_TOKEN_PREFIX);
        setJwt(undefined);
        setRefreshToken(undefined);
    };

    useRefreshToken({ crossmintAuthService, setAuthMaterial, logout });

    const login = () => {
        if (crossmint.jwt != null) {
            console.log("User already logged in");
            return;
        }

        setModalOpen(true);
    };

    useEffect(() => {
        if (crossmint.jwt == null) {
            const jwt = getCookie(SESSION_PREFIX);
            setJwt(jwt);
        }
    }, []);

    useEffect(() => {
        if (crossmint.jwt == null) {
            return;
        }

        setModalOpen(false);
    }, [crossmint.jwt]);

    const getAuthStatus = (): AuthStatus => {
        if (crossmint.jwt != null) {
            return "logged-in";
        }
        if (modalOpen) {
            return "in-progress";
        }
        return "logged-out";
    };

    return (
        <AuthContext.Provider
            value={{
                login,
                logout,
                jwt: crossmint.jwt,
                refreshToken: crossmint.refreshToken,
                status: getAuthStatus(),
            }}
        >
            <CrossmintWalletProvider
                defaultChain={embeddedWallets.defaultChain}
                showWalletModals={embeddedWallets.showWalletModals}
                appearance={appearance}
            >
                <WalletManager embeddedWallets={embeddedWallets} accessToken={crossmint.jwt}>
                    {children}
                </WalletManager>
                {modalOpen
                    ? createPortal(
                          <AuthModal
                              baseUrl={crossmintBaseUrl}
                              setModalOpen={setModalOpen}
                              setAuthMaterial={setAuthMaterial}
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
