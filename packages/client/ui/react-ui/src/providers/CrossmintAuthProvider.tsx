import {
    type ReactNode,
    type MouseEvent,
    createContext,
    useEffect,
    useMemo,
    useRef,
    useState,
    useCallback,
} from "react";
import { CrossmintAuth, getCookie } from "@crossmint/client-sdk-auth";
import { type UIConfig, validateApiKeyAndGetCrossmintBaseUrl } from "@crossmint/common-sdk-base";
import { type AuthMaterialWithUser, SESSION_PREFIX, type SDKExternalUser } from "@crossmint/common-sdk-auth";

import AuthFormDialog from "../components/auth/AuthFormDialog";
import { useCrossmint } from "../hooks";
import { AuthFormProvider } from "./auth/AuthFormProvider";
import { TwindProvider } from "./TwindProvider";
import type { AuthStatus, LoginMethod } from "@/types/auth";
import { DynamicWalletProvider } from "./dynamic/DynamicWalletProvider";

type CrossmintAuthProviderProps = {
    appearance?: UIConfig;
    termsOfServiceText?: string | ReactNode;
    prefetchOAuthUrls?: boolean;
    onLoginSuccess?: () => void;
    authModalTitle?: string;
    children: ReactNode;
    loginMethods?: LoginMethod[];
    refreshRoute?: string;
    logoutRoute?: string;
};

type AuthContextType = {
    crossmintAuth?: CrossmintAuth;
    login: (defaultEmail?: string | MouseEvent) => void;
    logout: () => void;
    jwt?: string;
    user?: SDKExternalUser;
    status: AuthStatus;
    getUser: () => void;
};

const defaultContextValue: AuthContextType = {
    crossmintAuth: undefined,
    login: () => {},
    logout: () => {},
    jwt: undefined,
    user: undefined,
    status: "initializing",
    getUser: () => {},
};

export const AuthContext = createContext<AuthContextType>(defaultContextValue);

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
    const [user, setUser] = useState<SDKExternalUser | undefined>(undefined);
    const { crossmint, setJwt, experimental_setAuth } = useCrossmint(
        "CrossmintAuthProvider must be used within CrossmintProvider"
    );
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
                        experimental_setAuth(undefined);
                    },
                    onTokenRefresh: (authMaterial: AuthMaterialWithUser) => {
                        setUser(authMaterial.user);
                        experimental_setAuth({
                            email: authMaterial.user.email,
                            jwt: authMaterial.jwt,
                        });
                    },
                },
                refreshRoute,
                logoutRoute,
            });
        }
        return crossmintAuthRef.current;
    }, []);

    const crossmintBaseUrl = validateApiKeyAndGetCrossmintBaseUrl(crossmint.apiKey);
    const [dialogOpen, setDialogOpen] = useState(false);
    const [initialized, setInitialized] = useState(false);
    const [defaultEmail, setDefaultEmail] = useState<string | undefined>(undefined);
    const [dynamicSdkLoaded, setDynamicSdkLoaded] = useState(true);
    const isWeb3Enabled = loginMethods.some((method) => method.startsWith("web3"));

    const triggerHasJustLoggedIn = useCallback(() => {
        onLoginSuccess?.();
    }, [onLoginSuccess]);

    // Initialize auth state
    useEffect(() => {
        if (crossmint.jwt == null) {
            const jwt = getCookie(SESSION_PREFIX);
            setJwt(jwt);
        }
        setInitialized(true);
    }, [crossmint.jwt, setJwt]);

    // Close dialog on successful login
    useEffect(() => {
        if (crossmint.jwt != null && dialogOpen) {
            setDialogOpen(false);
            triggerHasJustLoggedIn();
        }
    }, [crossmint.jwt, dialogOpen, triggerHasJustLoggedIn]);

    const login = useCallback(
        (defaultEmail?: string | MouseEvent) => {
            if (crossmint.jwt != null) {
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
        [crossmint.jwt]
    );

    const logout = useCallback(() => {
        console.log("Logging out");
        crossmintAuth.logout();
    }, [crossmintAuth]);

    const getAuthStatus = useCallback((): AuthStatus => {
        if (!initialized) {
            return "initializing";
        }
        if (isWeb3Enabled && !dynamicSdkLoaded) {
            return "initializing";
        }
        if (crossmint.jwt != null) {
            return "logged-in";
        }
        if (dialogOpen) {
            return "in-progress";
        }
        return "logged-out";
    }, [initialized, isWeb3Enabled, dynamicSdkLoaded, crossmint.jwt, dialogOpen]);

    const getUser = useCallback(async () => {
        if (crossmint.jwt == null) {
            console.log("User not logged in");
            return;
        }

        const user = await crossmintAuth.getUser();
        setUser(user);
        experimental_setAuth(user);
        return user;
    }, [crossmint.jwt, crossmintAuth, experimental_setAuth]);

    const authContextValue = useMemo(
        () => ({
            crossmintAuth,
            login,
            logout,
            jwt: crossmint.jwt,
            user,
            status: getAuthStatus(),
            getUser,
        }),
        [crossmintAuth, login, logout, crossmint.jwt, user, getAuthStatus, getUser]
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
