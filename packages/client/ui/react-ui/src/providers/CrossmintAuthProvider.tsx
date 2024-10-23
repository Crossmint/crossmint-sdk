import { type ReactNode, createContext, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";

import { CrossmintAuth, getCookie } from "@crossmint/client-sdk-auth";
import type { EVMSmartWalletChain } from "@crossmint/client-sdk-smart-wallet";
import { type UIConfig, validateApiKeyAndGetCrossmintBaseUrl } from "@crossmint/common-sdk-base";
import { SESSION_PREFIX, type SDKExternalUser } from "@crossmint/common-sdk-auth";

import AuthModal from "../components/auth/AuthModal";
import { useCrossmint, useWallet } from "../hooks";
import { CrossmintWalletProvider } from "./CrossmintWalletProvider";

export type CrossmintAuthWalletConfig = {
    defaultChain: EVMSmartWalletChain;
    createOnLogin: "all-users" | "off";
    type: "evm-smart-wallet";
    showWalletModals?: boolean;
};

export type LoginMethod = "email" | "google" | "farcaster";

export type CrossmintAuthProviderProps = {
    embeddedWallets?: CrossmintAuthWalletConfig;
    appearance?: UIConfig;
    children: ReactNode;
    loginMethods?: LoginMethod[];
};

type AuthStatus = "logged-in" | "logged-out" | "in-progress";

type AuthContextType = {
    crossmintAuth?: CrossmintAuth;
    login: () => void;
    logout: () => void;
    jwt?: string;
    refreshToken?: string;
    user?: SDKExternalUser;
    status: AuthStatus;
    getUser: () => void;
};

export const AuthContext = createContext<AuthContextType>({
    login: () => {},
    logout: () => {},
    status: "logged-out",
    getUser: () => {},
});

const defaultEmbeddedWallets: CrossmintAuthWalletConfig = {
    defaultChain: "base-sepolia",
    createOnLogin: "off",
    type: "evm-smart-wallet",
};

export function CrossmintAuthProvider({
    embeddedWallets = defaultEmbeddedWallets,
    children,
    appearance,
    loginMethods = ["email", "google"],
}: CrossmintAuthProviderProps) {
    const [user, setUser] = useState<SDKExternalUser | undefined>(undefined);
    const { crossmint, setJwt } = useCrossmint("CrossmintAuthProvider must be used within CrossmintProvider");
    // biome-ignore lint/correctness/useExhaustiveDependencies: crossmint changes with each jwt change
    const crossmintAuth = useMemo(
        () =>
            CrossmintAuth.from(crossmint, {
                onLogout: () => {
                    setJwt(undefined);
                    setUser(undefined);
                },
                onTokenRefresh: (authMaterial) => {
                    setJwt(authMaterial.jwt);
                    setUser(authMaterial.user);
                },
            }),
        []
    );
    const crossmintBaseUrl = validateApiKeyAndGetCrossmintBaseUrl(crossmint.apiKey);
    const [modalOpen, setModalOpen] = useState(false);

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

    const login = () => {
        if (crossmint.jwt != null) {
            console.log("User already logged in");
            return;
        }

        setModalOpen(true);
    };

    const getAuthStatus = (): AuthStatus => {
        if (crossmint.jwt != null) {
            return "logged-in";
        }
        if (modalOpen) {
            return "in-progress";
        }
        return "logged-out";
    };

    const getUser = async () => {
        if (crossmint.jwt == null) {
            console.log("User not logged in");
            return;
        }

        const user = await crossmintAuth.getUser();
        setUser(user);
    };

    return (
        <AuthContext.Provider
            value={{
                crossmintAuth,
                login,
                logout: crossmintAuth.logout,
                jwt: crossmint.jwt,
                user,
                status: getAuthStatus(),
                getUser,
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
                              apiKey={crossmint.apiKey}
                              appearance={appearance}
                              loginMethods={loginMethods}
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
