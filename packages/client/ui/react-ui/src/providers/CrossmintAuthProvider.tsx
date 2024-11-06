import { type ReactNode, createContext, useEffect, useState } from "react";

import { CrossmintAuthService } from "@crossmint/client-sdk-auth";
import type { EVMSmartWalletChain } from "@crossmint/client-sdk-smart-wallet";
import { type UIConfig, validateApiKeyAndGetCrossmintBaseUrl } from "@crossmint/common-sdk-base";
import {
    SESSION_PREFIX,
    REFRESH_TOKEN_PREFIX,
    type AuthMaterialWithUser,
    type SDKExternalUser,
} from "@crossmint/common-sdk-auth";

import AuthFormDialog from "../components/auth/AuthFormDialog";
import { useCrossmint, useRefreshToken, useWallet } from "../hooks";
import { CrossmintWalletProvider } from "./CrossmintWalletProvider";
import { deleteCookie, getCookie, setCookie } from "@/utils/authCookies";
import { AuthFormProvider } from "./auth/AuthFormProvider";
import { TwindProvider } from "./TwindProvider";

export type CrossmintAuthWalletConfig = {
    defaultChain: EVMSmartWalletChain;
    createOnLogin: "all-users" | "off";
    type: "evm-smart-wallet";
    showPasskeyHelpers?: boolean;
};

export type LoginMethod = "email" | "google" | "farcaster" | "web3";

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
    const [dialogOpen, setDialogOpen] = useState(false);

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

        setDialogOpen(false);
    }, [crossmint.jwt]);

    const login = () => {
        if (crossmint.jwt != null) {
            console.log("User already logged in");
            return;
        }

        setDialogOpen(true);
    };

    const getAuthStatus = (): AuthStatus => {
        if (crossmint.jwt != null) {
            return "logged-in";
        }
        if (dialogOpen) {
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
        <TwindProvider>
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
                    showPasskeyHelpers={embeddedWallets.showPasskeyHelpers}
                    appearance={appearance}
                >
                    <AuthFormProvider
                        initialState={{
                            apiKey: crossmint.apiKey,
                            baseUrl: crossmintBaseUrl,
                            fetchAuthMaterial,
                            appearance,
                            setDialogOpen,
                            loginMethods,
                            embeddedWallets,
                        }}
                    >
                        <WalletManager embeddedWallets={embeddedWallets} accessToken={crossmint.jwt}>
                            {children}
                        </WalletManager>

                        <AuthFormDialog open={dialogOpen} />
                    </AuthFormProvider>
                </CrossmintWalletProvider>
            </AuthContext.Provider>
        </TwindProvider>
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
