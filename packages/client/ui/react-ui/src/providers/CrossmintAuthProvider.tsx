import { type ReactNode, createContext, useCallback, useEffect, useState } from "react";

import { CrossmintAuthService } from "@crossmint/client-sdk-auth";
import type { EVMSmartWalletChain } from "@crossmint/client-sdk-smart-wallet";
import { type UIConfig, validateApiKeyAndGetCrossmintBaseUrl } from "@crossmint/common-sdk-base";
import {
    SESSION_PREFIX,
    REFRESH_TOKEN_PREFIX,
    type AuthMaterial,
    type SDKExternalUser,
} from "@crossmint/common-sdk-auth";

import AuthFormDialog from "../components/auth/AuthFormDialog";
import { useCrossmint, useRefreshToken, useWallet } from "../hooks";
import { CrossmintWalletProvider } from "./CrossmintWalletProvider";
import { deleteCookie, getCookie, setCookie } from "@/utils/authCookies";
import { AuthFormProvider } from "./auth/AuthFormProvider";
import { AuthForm } from "@/components/auth/AuthForm";

export type CrossmintAuthWalletConfig = {
    defaultChain: EVMSmartWalletChain;
    createOnLogin: "all-users" | "off";
    type: "evm-smart-wallet";
    showWalletModals?: boolean;
};

export type LoginMethod = "email" | "google" | "farcaster" | "discord";

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
    EmbeddedAuthForm: () => React.JSX.Element;
};

export const AuthContext = createContext<AuthContextType>({
    login: () => {},
    logout: () => {},
    status: "logged-out",
    getUser: () => {},
    EmbeddedAuthForm: () => <></>,
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
    const [isUsingEmbeddedAuthForm, setIsUsingEmbeddedAuthForm] = useState(false);

    const setAuthMaterial = (authMaterial: AuthMaterial) => {
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

    const fetchAuthMaterial = async (refreshToken: string): Promise<AuthMaterial> => {
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

    const EmbeddedAuthForm = useCallback(() => {
        useEffect(() => {
            setIsUsingEmbeddedAuthForm(true);
            return () => setIsUsingEmbeddedAuthForm(false);
        }, []);

        return (
            <AuthFormProvider
                initialState={{
                    apiKey: crossmint.apiKey,
                    baseUrl: crossmintBaseUrl,
                    fetchAuthMaterial,
                    appearance,
                }}
            >
                <AuthForm loginMethods={loginMethods} />
            </AuthFormProvider>
        );
    }, [crossmint.apiKey, crossmintBaseUrl, appearance, loginMethods]);

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
                EmbeddedAuthForm,
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
                {!isUsingEmbeddedAuthForm ? (
                    <AuthFormProvider
                        initialState={{
                            apiKey: crossmint.apiKey,
                            baseUrl: crossmintBaseUrl,
                            fetchAuthMaterial,
                            appearance,
                            setDialogOpen: setModalOpen,
                        }}
                    >
                        <AuthFormDialog open={modalOpen} loginMethods={loginMethods} />
                    </AuthFormProvider>
                ) : null}
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
