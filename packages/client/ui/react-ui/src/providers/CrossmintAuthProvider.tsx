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
import { useCrossmint, useWallet } from "../hooks";
import { CrossmintWalletProvider } from "./CrossmintWalletProvider";
import { AuthFormProvider } from "./auth/AuthFormProvider";
import { TwindProvider } from "./TwindProvider";
import type { AuthStatus, CrossmintAuthProviderEmbeddedWallets, LoginMethod } from "@/types/auth";
import type { GetOrCreateWalletAdminSigner, GetOrCreateWalletProps } from "@/types/wallet";
import { DynamicWeb3WalletConnect } from "./auth/web3/DynamicWeb3WalletConnect";
import { mapSignerToWalletType } from "@/utils/mapSignerToWalletType";
import { useDynamicConnect } from "@/hooks/useDynamicConnect";

type CrossmintAuthProviderProps = {
    embeddedWallets?: CrossmintAuthProviderEmbeddedWallets;
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

const defaultEmbeddedWallets: CrossmintAuthProviderEmbeddedWallets = {
    createOnLogin: "off",
    type: "evm-smart-wallet",
};

export function CrossmintAuthProvider({
    embeddedWallets = defaultEmbeddedWallets,
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
    const { crossmint, setJwt } = useCrossmint("CrossmintAuthProvider must be used within CrossmintProvider");
    // Only create the CrossmintAuth instance once, even in StrictMode, as the constructor calls /refresh
    // It can only be called once to avoid race conditions
    const crossmintAuthRef = useRef<CrossmintAuth | null>(null);
    // biome-ignore lint/correctness/useExhaustiveDependencies: crossmint can't be a dependency because it updates with each jwt change
    const crossmintAuth = useMemo(() => {
        if (!crossmintAuthRef.current) {
            crossmintAuthRef.current = CrossmintAuth.from(crossmint, {
                callbacks: {
                    onLogout: () => {
                        setJwt(undefined);
                        setUser(undefined);
                    },
                    onTokenRefresh: (authMaterial: AuthMaterialWithUser) => {
                        setJwt(authMaterial.jwt);
                        setUser(authMaterial.user);
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
    // Web3 auth related state
    const [isDynamicSdkLoaded, setIsDynamicSdkLoaded] = useState(false);
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
        crossmintAuth.logout();
    }, [crossmintAuth]);

    const getAuthStatus = useCallback((): AuthStatus => {
        if (!initialized) {
            return "initializing";
        }
        // For web3-enabled auth, we need to wait for the Dynamic SDK to load
        if (isWeb3Enabled && !isDynamicSdkLoaded) {
            return "initializing";
        }
        if (crossmint.jwt != null) {
            return "logged-in";
        }
        if (dialogOpen) {
            return "in-progress";
        }
        return "logged-out";
    }, [initialized, crossmint.jwt, dialogOpen, isDynamicSdkLoaded, isWeb3Enabled]);

    const getUser = useCallback(async () => {
        if (crossmint.jwt == null) {
            console.log("User not logged in");
            return;
        }

        const user = await crossmintAuth.getUser();
        setUser(user);
    }, [crossmint.jwt, crossmintAuth]);

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
                <CrossmintWalletProvider
                    key={crossmint.jwt}
                    showPasskeyHelpers={embeddedWallets.showPasskeyHelpers}
                    appearance={appearance}
                >
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
                            embeddedWallets,
                            baseUrl: crossmintBaseUrl,
                            defaultEmail,
                        }}
                    >
                        <DynamicWeb3WalletConnect
                            enabled={isWeb3Enabled}
                            apiKeyEnvironment={crossmint.apiKey.includes("production") ? "production" : "staging"}
                        >
                            <WalletManager
                                embeddedWallets={embeddedWallets}
                                accessToken={crossmint.jwt}
                                setIsDynamicSdkLoaded={setIsDynamicSdkLoaded}
                                isWeb3Enabled={isWeb3Enabled}
                            />

                            {children}
                            <AuthFormDialog open={dialogOpen} />
                        </DynamicWeb3WalletConnect>
                    </AuthFormProvider>
                </CrossmintWalletProvider>
            </AuthContext.Provider>
        </TwindProvider>
    );
}

function WalletManager({
    embeddedWallets,
    accessToken,
    setIsDynamicSdkLoaded,
    isWeb3Enabled,
}: {
    embeddedWallets: CrossmintAuthProviderEmbeddedWallets;
    accessToken: string | undefined;
    setIsDynamicSdkLoaded: (sdkHasLoaded: boolean) => void;
    isWeb3Enabled: boolean;
}) {
    const { getOrCreateWallet, clearWallet, status: walletStatus } = useWallet();
    const { sdkHasLoaded, getAdminSigner, cleanup, isDynamicWalletConnected } = useDynamicConnect(
        isWeb3Enabled,
        setIsDynamicSdkLoaded,
        accessToken
    );
    const { createOnLogin, adminSigner: defaultAdminSigner, linkedUser } = embeddedWallets;
    const canGetOrCreateWallet =
        createOnLogin === "all-users" && walletStatus === "not-loaded" && accessToken != null && sdkHasLoaded;

    const handleWalletCreation = useCallback(async () => {
        if (!canGetOrCreateWallet) {
            return;
        }

        let adminSigner: GetOrCreateWalletAdminSigner = defaultAdminSigner;
        let walletType = embeddedWallets.type;

        if (isDynamicWalletConnected) {
            adminSigner = (await getAdminSigner()) ?? adminSigner;
            walletType = mapSignerToWalletType(adminSigner?.type) ?? walletType;
        }

        // If an external wallet is not connected, the type is required
        if (!isDynamicWalletConnected && embeddedWallets.type == null) {
            console.error(
                "[CrossmintAuthProvider] ⚠️ embeddedWallets.type is required when no external wallet is connected"
            );
            return;
        }

        getOrCreateWallet({
            type: walletType,
            args: {
                adminSigner,
                linkedUser,
            },
        } as GetOrCreateWalletProps);
    }, [canGetOrCreateWallet, getOrCreateWallet, linkedUser, defaultAdminSigner, embeddedWallets.type, getAdminSigner]);

    const handleWalletCleanup = useCallback(() => {
        if (accessToken == null && walletStatus === "loaded") {
            clearWallet();
        }
        cleanup();
    }, [walletStatus, accessToken, clearWallet, cleanup]);

    useEffect(() => {
        handleWalletCreation();
        handleWalletCleanup();
    }, [handleWalletCreation, handleWalletCleanup]);

    return null;
}
