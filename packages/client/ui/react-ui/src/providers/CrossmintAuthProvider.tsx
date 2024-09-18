import { type ReactNode, createContext, useEffect, useState } from "react";
import { createPortal } from "react-dom";

import type { EVMSmartWalletChain } from "@crossmint/client-sdk-smart-wallet";
import { type UIConfig, validateApiKeyAndGetCrossmintBaseUrl } from "@crossmint/common-sdk-base";

import AuthModal from "../components/auth/AuthModal";
import { useCrossmint, useWallet } from "../hooks";
import { CrossmintWalletProvider } from "./CrossmintWalletProvider";

const SESSION_PREFIX = "crossmint-session";

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
    status: AuthStatus;
};

export const AuthContext = createContext<AuthContextType>({
    login: () => {},
    logout: () => {},
    status: "logged-out",
});

export function CrossmintAuthProvider({ embeddedWallets, children, appearance }: CrossmintAuthProviderProps) {
    const { crossmint, setJwt } = useCrossmint("CrossmintAuthProvider must be used within CrossmintProvider");
    const crossmintBaseUrl = validateApiKeyAndGetCrossmintBaseUrl(crossmint.apiKey);
    const [modalOpen, setModalOpen] = useState(false);

    useEffect(() => {
        const session = sessionFromClient();
        if (session != null) {
            setJwt(session);
        }
    }, []);

    const login = () => {
        if (crossmint.jwt != null) {
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

    const getAuthStatus = (): AuthStatus => {
        if (crossmint.jwt != null) {
            return "logged-in";
        }
        if (modalOpen) {
            return "in-progress";
        }
        return "logged-out";
    };

    function setAuthMaterial(authMaterial: { jwtToken: string; refreshToken: string }) {
        setJwt(authMaterial.jwtToken);
    }

    return (
        <AuthContext.Provider
            value={{
                login,
                logout,
                jwt: crossmint.jwt,
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

function sessionFromClient(): string | undefined {
    const crossmintSession = document.cookie.split("; ").find((row) => row.startsWith(SESSION_PREFIX));
    return crossmintSession ? crossmintSession.split("=")[1] : undefined;
}
