import { type MouseEvent, createContext, useEffect, useMemo, useRef, useState, useCallback } from "react";
import { CrossmintAuth, getCookie } from "@crossmint/client-sdk-auth";
import { validateApiKeyAndGetCrossmintBaseUrl } from "@crossmint/common-sdk-base";
import {
    type OAuthProvider,
    SESSION_PREFIX,
    type AuthMaterialWithUser,
    type SDKExternalUser,
} from "@crossmint/common-sdk-auth";
import { useCrossmint } from "@crossmint/client-sdk-react-base";
import type { Chain, ExternalWalletSignerConfigForChain } from "@crossmint/wallets-sdk";

import AuthFormDialog from "../components/auth/AuthFormDialog";
import { AuthFormProvider } from "./auth/AuthFormProvider";
import { TwindProvider } from "./TwindProvider";
import type { AuthStatus, CrossmintAuthProviderProps } from "@/types/auth";
import { DynamicWalletProvider } from "./dynamic/DynamicWalletProvider";
import { useOAuthWindowListener as experimental_loginWithOAuth } from "@/hooks/useOAuthWindowListener";

type AuthContextType = {
    crossmintAuth?: CrossmintAuth;
    login: (defaultEmail?: string | MouseEvent) => void;
    experimental_loginWithOAuth: (provider: OAuthProvider) => void;
    logout: () => void;
    jwt?: string;
    user?: SDKExternalUser;
    status: AuthStatus;
    getUser: () => void;
    experimental_externalWalletSigner: ExternalWalletSignerConfigForChain<Chain> | undefined;
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
    const { crossmint } = useCrossmint("CrossmintAuthProvider must be used within CrossmintProvider");
    const [user, setUser] = useState<SDKExternalUser | undefined>(undefined);
    const [jwt, setJwt] = useState<string | undefined>(undefined);

    const crossmintBaseUrl = validateApiKeyAndGetCrossmintBaseUrl(crossmint.apiKey);
    const [dialogOpen, setDialogOpen] = useState(false);
    const [initialized, setInitialized] = useState(false);
    const [defaultEmail, setDefaultEmail] = useState<string | undefined>(undefined);
    const [dynamicSdkLoaded, setDynamicSdkLoaded] = useState(true);
    const isWeb3Enabled = loginMethods.some((method) => method.startsWith("web3"));
    const [externalWalletSigner, setExternalWalletSigner] = useState<
        ExternalWalletSignerConfigForChain<Chain> | undefined
    >(undefined);

    // Only create the CrossmintAuth instance once, even in StrictMode, as the constructor calls /refresh
    // It can only be called once to avoid race conditions
    const crossmintAuthRef = useRef<CrossmintAuth | null>(null);
    // biome-ignore lint/correctness/useExhaustiveDependencies: crossmint can't be a dependency because it updates with each jwt change
    const crossmintAuth = useMemo(() => {
        if (!crossmintAuthRef.current) {
            crossmintAuthRef.current = CrossmintAuth.from(crossmint, {
                callbacks: {
                    onLogout: () => {
                        setUser(undefined);
                        setJwt(undefined);
                    },
                    onTokenRefresh: (authMaterial: AuthMaterialWithUser) => {
                        setUser(authMaterial.user);
                        setJwt(authMaterial.jwt);
                    },
                },
                refreshRoute,
                logoutRoute,
            });
        }
        return crossmintAuthRef.current;
    }, []);

    const triggerHasJustLoggedIn = useCallback(() => {
        onLoginSuccess?.();
    }, [onLoginSuccess]);

    // Initialize auth state
    useEffect(() => {
        if (jwt == null) {
            const jwt = getCookie(SESSION_PREFIX);
            setJwt(jwt);
        }
        setInitialized(true);
    }, [jwt]);

    // Close dialog on successful login
    useEffect(() => {
        if (jwt != null && dialogOpen) {
            setDialogOpen(false);
            triggerHasJustLoggedIn();
        }
    }, [jwt, dialogOpen, triggerHasJustLoggedIn]);

    const login = useCallback(
        (defaultEmail?: string | MouseEvent) => {
            if (jwt != null) {
                console.log("User already logged in");
                return;
            }

            // Only set defaultEmail when explicitly passed as a string, ignoring MouseEvent from onClick handlers
            // PREVENTS BREAKING CHANGE!
            if (defaultEmail != null && typeof defaultEmail === "string") {
                setDefaultEmail(defaultEmail);
            }
            setDialogOpen(true);
        },
        [jwt]
    );

    const logout = useCallback(() => {
        crossmintAuth.logout();
    }, [crossmintAuth]);

    const getAuthStatus = useCallback((): AuthStatus => {
        if (!initialized) {
            return "initializing";
        }
        if (isWeb3Enabled && !dynamicSdkLoaded) {
            return "initializing";
        }
        if (jwt != null) {
            return "logged-in";
        }
        if (dialogOpen) {
            return "in-progress";
        }
        return "logged-out";
    }, [initialized, isWeb3Enabled, dynamicSdkLoaded, jwt, dialogOpen]);

    const getUser = useCallback(async () => {
        if (jwt == null) {
            console.log("User not logged in");
            return;
        }

        const user = await crossmintAuth.getUser();
        setUser(user);
        return user;
    }, [jwt, crossmintAuth]);

    const authContextValue = useMemo(
        () => ({
            crossmintAuth,
            login,
            experimental_loginWithOAuth,
            logout,
            jwt,
            user,
            experimental_externalWalletSigner: externalWalletSigner,
            status: getAuthStatus(),
            getUser,
        }),
        [crossmintAuth, login, logout, jwt, user, getAuthStatus, getUser, externalWalletSigner]
    );

    return (
        <TwindProvider>
            <AuthContext.Provider value={authContextValue}>
                <AuthFormProvider
                    setDialogOpen={(open, successfulLogin) => {
                        setDialogOpen(open);
                        if (successfulLogin) {
                            // This will be triggered from the OTP form
                            triggerHasJustLoggedIn();
                        }
                    }}
                    preFetchOAuthUrls={getAuthStatus() === "logged-out" && prefetchOAuthUrls}
                    initialState={{
                        appearance,
                        loginMethods,
                        termsOfServiceText,
                        authModalTitle,
                        baseUrl: crossmintBaseUrl,
                        defaultEmail,
                    }}
                >
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
                </AuthFormProvider>
            </AuthContext.Provider>
        </TwindProvider>
    );
}
