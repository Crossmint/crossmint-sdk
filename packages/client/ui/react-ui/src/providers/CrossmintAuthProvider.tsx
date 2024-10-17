import { type ReactNode, createContext, useEffect, useState } from "react";
import { createPortal } from "react-dom";

import { CrossmintAuthService } from "@crossmint/client-sdk-auth";
import type { EVMSmartWalletChain } from "@crossmint/client-sdk-smart-wallet";
import { type UIConfig, validateApiKeyAndGetCrossmintBaseUrl } from "@crossmint/common-sdk-base";
import {
    SESSION_PREFIX,
    REFRESH_TOKEN_PREFIX,
    type AuthMaterialWithUser,
    type SDKExternalUser,
} from "@crossmint/common-sdk-auth";

import AuthModal from "../components/auth/AuthModal";
import { useCrossmint, useRefreshToken, useWallet } from "../hooks";
import { CrossmintWalletProvider } from "./CrossmintWalletProvider";
import { deleteCookie, getCookie, setCookie } from "@/utils/authCookies";

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
    const { crossmint, setJwt, setRefreshToken } = useCrossmint(
        "CrossmintAuthProvider must be used within CrossmintProvider"
    );
    const crossmintAuthService = new CrossmintAuthService(crossmint.apiKey);
    const crossmintBaseUrl = validateApiKeyAndGetCrossmintBaseUrl(crossmint.apiKey);
    const [modalOpen, setModalOpen] = useState(false);

    const setAuthMaterial = (authMaterial: AuthMaterialWithUser) => {
        setCookie(SESSION_PREFIX, authMaterial.jwt);
        setCookie(REFRESH_TOKEN_PREFIX, authMaterial.refreshToken.secret, authMaterial.refreshToken.expiresAt);
        setJwt(authMaterial.jwt);
        setRefreshToken(authMaterial.refreshToken.secret);
        setUser(authMaterial.user);
    };

    const logout = () => {
        deleteCookie(SESSION_PREFIX);
        deleteCookie(REFRESH_TOKEN_PREFIX);
        setJwt(undefined);
        setRefreshToken(undefined);
        setUser(undefined);
    };

    useRefreshToken({ crossmintAuthService, setAuthMaterial, logout });

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

    const fetchAuthMaterial = async (refreshToken: string): Promise<AuthMaterialWithUser> => {
        const authMaterial = await crossmintAuthService.refreshAuthMaterial(refreshToken);
        setAuthMaterial(authMaterial);
        return authMaterial;
    };

    const getUser = async () => {
        if (crossmint.jwt == null) {
            console.log("User not logged in");
            return;
        }

        const user = await crossmintAuthService.getUserFromClient(crossmint.jwt);
        setUser(user);
    };

    return (
        <AuthContext.Provider
            value={{
                login,
                logout,
                jwt: crossmint.jwt,
                refreshToken: crossmint.refreshToken,
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
                              fetchAuthMaterial={fetchAuthMaterial}
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
