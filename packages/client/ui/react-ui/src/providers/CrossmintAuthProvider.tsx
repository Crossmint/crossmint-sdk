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
import type { EVMSmartWalletChain } from "@crossmint/client-sdk-smart-wallet";
import { type UIConfig, validateApiKeyAndGetCrossmintBaseUrl } from "@crossmint/common-sdk-base";
import { type AuthMaterialWithUser, SESSION_PREFIX, type SDKExternalUser } from "@crossmint/common-sdk-auth";

import AuthFormDialog from "../components/auth/AuthFormDialog";
import { useCrossmint, useWallet } from "../hooks";
import { CrossmintWalletProvider } from "./CrossmintWalletProvider";
import { AuthFormProvider } from "./auth/AuthFormProvider";
import { TwindProvider } from "./TwindProvider";

export type CrossmintAuthWalletConfig = {
    defaultChain: EVMSmartWalletChain;
    createOnLogin: "all-users" | "off";
    type: "evm-smart-wallet";
    showPasskeyHelpers?: boolean;
};

export type LoginMethod = "email" | "google" | "farcaster" | "web3" | "twitter";

export type CrossmintAuthProviderProps = {
    embeddedWallets?: CrossmintAuthWalletConfig;
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

type AuthStatus = "logged-in" | "logged-out" | "in-progress" | "initializing";

export interface AuthContextType {
    crossmintAuth?: CrossmintAuth;
    login: (defaultEmail?: string | MouseEvent) => void;
    logout: () => void;
    jwt?: string;
    user?: SDKExternalUser;
    status: AuthStatus;
    getUser: () => void;
}

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

const defaultEmbeddedWallets: CrossmintAuthWalletConfig = {
    defaultChain: "base-sepolia",
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
    const [defaultEmail, setdefaultEmail] = useState<string | undefined>(undefined);

    const triggerHasJustLoggedIn = useCallback(() => {
        onLoginSuccess?.();
    }, [onLoginSuccess]);

    useEffect(() => {
        if (crossmint.jwt == null) {
            const jwt = getCookie(SESSION_PREFIX);
            setJwt(jwt);
        }
        setInitialized(true);
    }, []);

    useEffect(() => {
        if (crossmint.jwt != null && dialogOpen) {
            setDialogOpen(false);
            triggerHasJustLoggedIn();
        }
    }, [crossmint.jwt, dialogOpen, onLoginSuccess]);

    const login = (defaultEmail?: string | MouseEvent) => {
        if (crossmint.jwt != null) {
            console.log("User already logged in");
            return;
        }

        // Only set defaultEmail when explicitly passed as a string, ignoring MouseEvent from onClick handlers
        // PREVENTS BREAKING CHANGE!
        if (defaultEmail != null && typeof defaultEmail === "string") {
            setdefaultEmail(defaultEmail);
        }
        setDialogOpen(true);
    };

    const logout = () => {
        crossmintAuth.logout();
    };

    const getAuthStatus = (): AuthStatus => {
        if (!initialized) {
            return "initializing";
        }
        if (crossmint.jwt != null) {
            return "logged-in";
        }
        if (dialogOpen) {
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
        <TwindProvider>
            <AuthContext.Provider
                value={{
                    crossmintAuth,
                    login,
                    logout,
                    jwt: crossmint.jwt,
                    user,
                    status: getAuthStatus(),
                    getUser,
                }}
            >
                <CrossmintWalletProvider
                    key={crossmint.jwt}
                    defaultChain={embeddedWallets.defaultChain}
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
            getOrCreateWallet();
        }

        if (status === "loaded" && accessToken == null) {
            clearWallet();
        }
    }, [accessToken, status]);

    return <>{children}</>;
}
