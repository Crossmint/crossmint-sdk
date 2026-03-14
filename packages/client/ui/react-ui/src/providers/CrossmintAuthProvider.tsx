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

import AuthFormDialog from "../components/auth/AuthFormDialog";
import { AuthFormProvider } from "./auth/AuthFormProvider";
import { OAuthFlowProvider, useOAuthFlow } from "./auth/OAuthFlowProvider";
import type { CrossmintAuthProviderProps } from "@/types/auth";
import type { CrossmintAuthContext } from "@/hooks/useAuth";

const defaultContextValue: CrossmintAuthContext = {
    crossmintAuth: undefined,
    login: () => {},
    logout: async () => {},
    jwt: undefined,
    user: undefined,
    status: "initializing",
    getUser: () => {},
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
    const { crossmint, setJwt } = useCrossmint("CrossmintAuthProvider must be used within CrossmintProvider");

    const crossmintBaseUrl = validateApiKeyAndGetCrossmintBaseUrl(crossmint.apiKey);
    const [dialogOpen, setDialogOpen] = useState(false);
    const [defaultEmail, setDefaultEmail] = useState<string | undefined>(undefined);

    // Ref to hold the OAuth login function that will be assigned by AuthWrapper
    const loginWithOAuthRef = useRef<((provider: OAuthProvider) => Promise<void>) | null>(null);

    // Handle auth sync with Crossmint
    useEffect(() => {
        setJwt(baseAuth.jwt);
    }, [baseAuth.jwt, setJwt]);

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
        if (baseAuth.jwt != null) {
            return "logged-in";
        }
        if (dialogOpen) {
            return "in-progress";
        }
        return "logged-out";
    }, [baseAuth.status, baseAuth.jwt, dialogOpen]);

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
            experimental_loginWithOAuth,
            loginMethods,
        }),
        [baseAuth, login, getAuthStatus, experimental_loginWithOAuth, loginMethods]
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
                        {children}
                        <AuthFormDialog open={dialogOpen} />
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
