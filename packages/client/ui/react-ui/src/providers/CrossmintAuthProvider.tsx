import { type ReactNode, createContext, useEffect, useState } from "react";
import { createPortal } from "react-dom";

import type { EVMSmartWalletChain } from "@crossmint/client-sdk-smart-wallet";
import { type UIConfig, validateApiKeyAndGetCrossmintBaseUrl } from "@crossmint/common-sdk-base";

import AuthModal from "../components/auth/AuthModal";
import { useCrossmint, useWallet } from "../hooks";
import { CrossmintWalletProvider } from "./CrossmintWalletProvider";

const SESSION_PREFIX = "crossmint-session";
const REFRESH_TOKEN_PREFIX = "crossmint-refresh-token";

export type CrossmintAuthWalletConfig = {
    defaultChain: EVMSmartWalletChain;
    createOnLogin: "all-users" | "off";
    type: "evm-smart-wallet";
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
    const crossmintBaseUrl = validateApiKeyAndGetCrossmintBaseUrl(crossmint.apiKey);
    const [modalOpen, setModalOpen] = useState(false);

    useEffect(() => {
        const session = getSessionTokenFromCookie();
        const refreshToken = getRefreshTokenFromCookie();
        if (session != null) {
            setJwt(session);
        }
        if (refreshToken != null) {
            setRefreshToken(refreshToken);
        }
    }, [setJwt, setRefreshToken]);

    const login = () => {
        if (crossmint.jwt != null) {
            console.log("User already logged in");
            return;
        }

        setModalOpen(true);
    };

    const logout = () => {
        document.cookie = `${SESSION_PREFIX}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
        document.cookie = `${REFRESH_TOKEN_PREFIX}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
        setJwt(undefined);
        setRefreshToken(undefined);
    };

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

    function setAuthMaterial(authMaterial: {
        jwtToken: string;
        refreshToken: {
            secret: string;
            expiresAt: string;
        };
    }) {
        document.cookie = `${SESSION_PREFIX}=${crossmint.jwt}; path=/;SameSite=Lax;`;
        setJwt(authMaterial.jwtToken);
        document.cookie = `${REFRESH_TOKEN_PREFIX}=${authMaterial.refreshToken.secret}; path=/; expires=${authMaterial.refreshToken.expiresAt}; SameSite=Lax;`;
        setRefreshToken(authMaterial.refreshToken.secret);
    }

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
            <CrossmintWalletProvider defaultChain={embeddedWallets.defaultChain}>
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

function getSessionTokenFromCookie(): string | undefined {
    const crossmintSession = document.cookie.split("; ").find((row) => row.startsWith(SESSION_PREFIX));
    return crossmintSession ? crossmintSession.split("=")[1] : undefined;
}

function getRefreshTokenFromCookie(): string | undefined {
    const crossmintRefreshToken = document.cookie.split("; ").find((row) => row.startsWith(REFRESH_TOKEN_PREFIX));
    return crossmintRefreshToken ? crossmintRefreshToken.split("=")[1] : undefined;
}
