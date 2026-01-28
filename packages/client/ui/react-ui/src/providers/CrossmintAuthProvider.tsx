import type React from "react";
import { type MouseEvent, useEffect, useMemo, useState, useCallback, createContext, useRef } from "react";
import { validateApiKeyAndGetCrossmintBaseUrl } from "@crossmint/common-sdk-base";
import type { OAuthProvider } from "@crossmint/common-sdk-auth";
import {
    type AuthStatus,
    useCrossmint,
    CrossmintAuthBaseProvider,
    useCrossmintAuthBase,
} from "@crossmint/client-sdk-react-base";
import type { Chain, ExternalWalletSignerConfigForChain } from "@crossmint/wallets-sdk";

import AuthFormDialog from "../components/auth/AuthFormDialog";
import { AuthFormProvider } from "./auth/AuthFormProvider";
import { OAuthFlowProvider, useOAuthFlow } from "./auth/OAuthFlowProvider";
import type { CrossmintAuthProviderProps } from "@/types/auth";
import { DynamicWalletProvider } from "./dynamic/DynamicWalletProvider";
import type { CrossmintAuthContext } from "@/hooks/useAuth";

const defaultContextValue: CrossmintAuthContext = {
    crossmintAuth: undefined,
    login: () => {},
    logout: async () => {},
    jwt: undefined,
    user: undefined,
    status: "initializing",
    getUser: () => {},
    experimental_externalWalletSigner: undefined,
    experimental_loginWithOAuth: () => Promise.resolve(),
    loginMethods: [],
};

export const AuthContext = createContext<CrossmintAuthContext>(defaultContextValue);

function CrossmintAuthProviderContent({
    children,
    appearance,
    termsOfServiceText,
    prefetchOAuthUrls = true,
    authModalTitle,
    onLoginSuccess,
    loginMethods = ["email", "google"],
}: CrossmintAuthProviderProps) {
    const baseAuth = useCrossmintAuthBase();
    const { crossmint, experimental_setCustomAuth, experimental_customAuth } = useCrossmint(
        "CrossmintAuthProvider must be used within CrossmintProvider"
    );

    const crossmintBaseUrl = validateApiKeyAndGetCrossmintBaseUrl(crossmint.apiKey);
    const [dialogOpen, setDialogOpen] = useState(false);
    const [defaultEmail, setDefaultEmail] = useState<string | undefined>(undefined);
    const [dynamicSdkLoaded, setDynamicSdkLoaded] = useState(true);
    const isWeb3Enabled = loginMethods.some((method) => method.startsWith("web3"));
    const [externalWalletSigner, setExternalWalletSigner] = useState<
        ExternalWalletSignerConfigForChain<Chain> | undefined
    >(undefined);

    // Ref to hold the OAuth login function that will be assigned by AuthWrapper
    const loginWithOAuthRef = useRef<((provider: OAuthProvider) => Promise<void>) | null>(null);

    // Handle auth sync with Crossmint
    useEffect(() => {
        if (baseAuth.jwt == null && experimental_customAuth?.jwt != null) {
            experimental_setCustomAuth(undefined);
        }
        if (externalWalletSigner != null || baseAuth.user?.email != null) {
            experimental_setCustomAuth({
                jwt: baseAuth.jwt,
                email: baseAuth.user?.email,
                externalWalletSigner: externalWalletSigner,
            });
        } else {
            experimental_setCustomAuth({ jwt: baseAuth.jwt });
        }
    }, [externalWalletSigner, baseAuth.jwt, baseAuth.user, experimental_setCustomAuth, experimental_customAuth]);

    // Close dialog when login succeeds
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
            if (baseAuth.jwt != null) {
                console.log("User already logged in");
                return;
            }
            await loginWithOAuthRef.current?.(provider);
        },
        [baseAuth.jwt]
    );

    const uiAuthContextValue = useMemo(
        () => ({
            ...baseAuth,
            login,
            status: getAuthStatus(),
            experimental_externalWalletSigner: externalWalletSigner,
            experimental_loginWithOAuth,
            loginMethods,
        }),
        [baseAuth, login, getAuthStatus, externalWalletSigner, experimental_loginWithOAuth, loginMethods]
    );

    return (
        <AuthContext.Provider value={uiAuthContextValue}>
            <AuthFormProvider
                setDialogOpen={(open, successfulLogin) => {
                    setDialogOpen(open);
                    if (successfulLogin) {
                        onLoginSuccess?.();
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

// This wrapper is needed in order to assign the OAuth login function to the ref
// so that it can be used in the AuthFormProvider above.
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

    return <>{children}</>;
}

export function CrossmintAuthProvider({
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
            <CrossmintAuthProviderContent
                onLoginSuccess={onLoginSuccess}
                appearance={appearance}
                termsOfServiceText={termsOfServiceText}
                prefetchOAuthUrls={prefetchOAuthUrls}
                authModalTitle={authModalTitle}
                loginMethods={loginMethods}
            >
                {children}
            </CrossmintAuthProviderContent>
        </CrossmintAuthBaseProvider>
    );
}
