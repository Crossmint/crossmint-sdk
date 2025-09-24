import { type MouseEvent, createContext, useEffect, useMemo, useRef, useState, useCallback } from "react";
import type { CrossmintAuth } from "@crossmint/client-sdk-auth";
import { validateApiKeyAndGetCrossmintBaseUrl } from "@crossmint/common-sdk-base";
import type { OAuthProvider, SDKExternalUser } from "@crossmint/common-sdk-auth";
import {
    useCrossmint,
    CrossmintAuthBaseProvider,
    useCrossmintAuthBase,
    type AuthStatus,
} from "@crossmint/client-sdk-react-base";

import AuthFormDialog from "../components/auth/AuthFormDialog";
import { AuthFormProvider } from "./auth/AuthFormProvider";
import { OAuthFlowProvider, useOAuthFlow } from "./auth/OAuthFlowProvider";
import type { CrossmintAuthProviderProps } from "@/types/auth";
import { DynamicWalletProvider } from "./dynamic/DynamicWalletProvider";

type AuthContextType = {
    crossmintAuth?: CrossmintAuth;
    login: (defaultEmail?: string | MouseEvent) => void;
    experimental_loginWithOAuth: (provider: OAuthProvider) => void;
    logout: () => void;
    jwt?: string;
    user?: SDKExternalUser;
    status: AuthStatus;
    getUser: () => void;
    experimental_externalWalletSigner: any;
    loginMethods: CrossmintAuthProviderProps["loginMethods"];
};

const defaultContextValue: AuthContextType = {
    crossmintAuth: undefined,
    login: () => {},
    experimental_loginWithOAuth: () => {},
    logout: () => {},
    jwt: undefined,
    user: undefined,
    status: "initializing",
    getUser: () => {},
    experimental_externalWalletSigner: undefined,
    loginMethods: [],
};

export const AuthContext = createContext<AuthContextType>(defaultContextValue);

export function CrossmintAuthProviderInternal({
    children,
    appearance,
    termsOfServiceText,
    prefetchOAuthUrls = true,
    authModalTitle,
    onLoginSuccess,
    loginMethods = ["email", "google"],
    refreshRoute,
    logoutRoute,
}: CrossmintAuthProviderProps) {
    return (
        <CrossmintAuthBaseProvider
            onLoginSuccess={onLoginSuccess}
            refreshRoute={refreshRoute}
            logoutRoute={logoutRoute}
        >
            <CrossmintAuthProviderInternalContent
                appearance={appearance}
                termsOfServiceText={termsOfServiceText}
                prefetchOAuthUrls={prefetchOAuthUrls}
                authModalTitle={authModalTitle}
                loginMethods={loginMethods}
            >
                {children}
            </CrossmintAuthProviderInternalContent>
        </CrossmintAuthBaseProvider>
    );
}

function CrossmintAuthProviderInternalContent({
    children,
    appearance,
    termsOfServiceText,
    prefetchOAuthUrls = true,
    authModalTitle,
    loginMethods = ["email", "google"],
}: Omit<CrossmintAuthProviderProps, "onLoginSuccess" | "refreshRoute" | "logoutRoute">) {
    const baseAuth = useCrossmintAuthBase();
    const { crossmint } = useCrossmint("CrossmintAuthProvider must be used within CrossmintProvider");

    const crossmintBaseUrl = validateApiKeyAndGetCrossmintBaseUrl(crossmint.apiKey);
    const [dialogOpen, setDialogOpen] = useState(false);
    const [defaultEmail, setDefaultEmail] = useState<string | undefined>(undefined);
    const [dynamicSdkLoaded, setDynamicSdkLoaded] = useState(true);
    const isWeb3Enabled = loginMethods.some((method) => method.startsWith("web3"));
    const [externalWalletSigner, setExternalWalletSigner] = useState<any>(undefined);

    const loginWithOAuthRef = useRef<((provider: OAuthProvider) => Promise<void>) | null>(null);

    useEffect(() => {
        if (baseAuth.jwt != null && dialogOpen) {
            setDialogOpen(false);
        }
    }, [baseAuth.jwt, dialogOpen]);

    const login = useCallback(
        (defaultEmail?: string | MouseEvent) => {
            if (baseAuth.jwt != null) {
                console.log("User already logged in");
                return;
            }

            if (defaultEmail != null && typeof defaultEmail === "string") {
                setDefaultEmail(defaultEmail);
            }
            setDialogOpen(true);
        },
        [baseAuth.jwt]
    );

    const getAuthStatus = useCallback((): AuthStatus => {
        if (baseAuth.status === "initializing") {
            return "initializing";
        }
        if (isWeb3Enabled && !dynamicSdkLoaded) {
            return "initializing";
        }
        if (baseAuth.jwt != null) {
            return "logged-in";
        }
        if (dialogOpen) {
            return "in-progress";
        }
        return "logged-out";
    }, [baseAuth.status, baseAuth.jwt, isWeb3Enabled, dynamicSdkLoaded, dialogOpen]);

    const experimental_loginWithOAuth = useCallback(
        async (provider: OAuthProvider) => {
            await loginWithOAuthRef.current?.(provider);
        },
        [loginWithOAuthRef]
    );

    const authContextValue = useMemo(
        () => ({
            crossmintAuth: baseAuth.crossmintAuth,
            login,
            experimental_loginWithOAuth,
            logout: baseAuth.logout,
            jwt: baseAuth.jwt,
            user: baseAuth.user,
            status: getAuthStatus(),
            getUser: baseAuth.getUser,
            loginMethods,
            experimental_externalWalletSigner: externalWalletSigner,
        }),
        [
            baseAuth.crossmintAuth,
            login,
            experimental_loginWithOAuth,
            baseAuth.logout,
            baseAuth.jwt,
            baseAuth.user,
            getAuthStatus,
            baseAuth.getUser,
            loginMethods,
            externalWalletSigner,
        ]
    );

    return (
        <AuthContext.Provider value={authContextValue}>
            <AuthFormProvider
                setDialogOpen={(open, successfulLogin) => {
                    setDialogOpen(open);
                    if (successfulLogin) {
                    }
                }}
                initialState={{
                    appearance,
                    loginMethods,
                    termsOfServiceText,
                    authModalTitle,
                    baseUrl: crossmintBaseUrl,
                    defaultEmail,
                }}
            >
                <OAuthFlowProvider prefetchOAuthUrls={getAuthStatus() === "logged-out" && prefetchOAuthUrls}>
                    <AuthWrapper loginWithOAuthRef={loginWithOAuthRef}>
                        {isWeb3Enabled ? (
                            <DynamicWalletProvider
                                apiKeyEnvironment={crossmint.apiKey.includes("production") ? "production" : "staging"}
                                loginMethods={loginMethods}
                                appearance={appearance}
                                onSdkLoaded={setDynamicSdkLoaded}
                                onWalletConnected={setExternalWalletSigner}
                            >
                                {children}
                                <AuthFormDialog open={dialogOpen} />
                            </DynamicWalletProvider>
                        ) : (
                            <>
                                {children}
                                <AuthFormDialog open={dialogOpen} />
                            </>
                        )}
                    </AuthWrapper>
                </OAuthFlowProvider>
            </AuthFormProvider>
        </AuthContext.Provider>
    );
}

function AuthWrapper({
    children,
    loginWithOAuthRef,
}: {
    children: React.ReactNode;
    loginWithOAuthRef: React.MutableRefObject<((provider: OAuthProvider) => Promise<void>) | null>;
}) {
    const { startOAuthLogin } = useOAuthFlow();
    const baseAuth = useCrossmintAuthBase();

    const loginWithOAuth = useCallback(
        async (provider: OAuthProvider) => {
            if (baseAuth.jwt != null) {
                console.log("User already logged in");
                return;
            }
            await startOAuthLogin(provider);
        },
        [baseAuth.jwt, startOAuthLogin]
    );

    useEffect(() => {
        loginWithOAuthRef.current = loginWithOAuth;
    }, [loginWithOAuth, loginWithOAuthRef]);

    return children;
}
