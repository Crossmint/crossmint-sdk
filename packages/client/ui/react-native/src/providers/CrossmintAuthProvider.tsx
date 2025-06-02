import { type ReactNode, createContext, useEffect, useMemo, useRef, useState, useCallback } from "react";
import * as WebBrowser from "expo-web-browser";
import { CrossmintAuth, type StorageProvider } from "@crossmint/client-sdk-auth";
import {
    type AuthMaterialWithUser,
    type SDKExternalUser,
    type OAuthProvider,
    SESSION_PREFIX,
} from "@crossmint/common-sdk-auth";

import { useCrossmint } from "../hooks";
import { SecureStorage } from "../utils/SecureStorage";
import { Platform } from "react-native";
import Constants from "expo-constants";
import type { User } from "@crossmint/common-sdk-base";

type OAuthUrlMap = Record<OAuthProvider, string | null>;
const initialOAuthUrlMap: OAuthUrlMap = {
    google: null,
    twitter: null,
};

type AuthStatus = "logged-in" | "logged-out" | "in-progress" | "initializing";

export type AuthContextType = {
    crossmintAuth?: CrossmintAuth;
    logout: () => void;
    jwt?: string;
    user?: SDKExternalUser;
    status: AuthStatus;
    getUser: () => void;
    loginWithOAuth: (provider: OAuthProvider) => Promise<void>;
    createAuthSession: (urlOrOneTimeSecret: string) => Promise<AuthMaterialWithUser | null>;
};

type CrossmintAuthProviderProps = {
    prefetchOAuthUrls?: boolean;
    onLoginSuccess?: () => void;
    authModalTitle?: string;
    children: ReactNode;
    refreshRoute?: string;
    logoutRoute?: string;
    customStorageProvider?: StorageProvider;
    appSchema?: string | string[];
};

const defaultContextValue: AuthContextType = {
    crossmintAuth: undefined,
    logout: () => {},
    jwt: undefined,
    user: undefined,
    status: "initializing",
    getUser: () => {},
    loginWithOAuth: () => Promise.resolve(),
    createAuthSession: () => Promise.resolve(null),
};

export const AuthContext = createContext<AuthContextType>(defaultContextValue);

export function CrossmintAuthProvider({
    children,
    onLoginSuccess,
    refreshRoute,
    logoutRoute,
    customStorageProvider,
    appSchema,
}: CrossmintAuthProviderProps) {
    const [user, setUser] = useState<SDKExternalUser | undefined>(undefined);
    const {
        crossmint,
        setJwt,
        setUser: setCrossmintUser,
    } = useCrossmint("CrossmintAuthProvider must be used within CrossmintProvider");
    const [oauthUrlMap, setOauthUrlMap] = useState<OAuthUrlMap>(initialOAuthUrlMap);
    const crossmintAuthRef = useRef<CrossmintAuth | null>(null);
    const storageProvider = useMemo(() => customStorageProvider ?? new SecureStorage(), [customStorageProvider]);
    const [initialized, setInitialized] = useState(false);
    const [inProgress, setInProgress] = useState(false);

    const singleAppSchema = Array.isArray(appSchema) ? appSchema[0] : appSchema;
    const isRunningInExpoGo =
        Constants.executionEnvironment === "storeClient" ||
        Constants.appOwnership === "expo" ||
        !!Constants.expoVersion;
    const resolvedAppSchema = isRunningInExpoGo ? "exp://127.0.0.1:8081" : singleAppSchema;

    // biome-ignore lint/correctness/useExhaustiveDependencies: crossmint can't be a dependency because it updates with each jwt change
    const crossmintAuth = useMemo(() => {
        if (!crossmintAuthRef.current) {
            const config = {
                callbacks: {
                    onLogout: () => {
                        setUser(undefined);
                        setCrossmintUser(undefined);
                    },
                    onTokenRefresh: (authMaterial: AuthMaterialWithUser) => {
                        setUser(authMaterial.user);
                        setCrossmintUser({
                            email: authMaterial.user.email,
                            jwt: authMaterial.jwt,
                        });
                    },
                },
                refreshRoute,
                logoutRoute,
                storageProvider,
            };

            crossmintAuthRef.current = CrossmintAuth.from(crossmint, config);
        }
        return crossmintAuthRef.current;
    }, [storageProvider]);

    const triggerHasJustLoggedIn = useCallback(() => {
        onLoginSuccess?.();
    }, [onLoginSuccess]);

    useEffect(() => {
        if (crossmint.jwt == null) {
            storageProvider
                ?.get(SESSION_PREFIX)
                .then((jwt) => {
                    if (jwt != null) {
                        setJwt(jwt);
                    }
                })
                .finally(() => {
                    setInitialized(true);
                });
        } else {
            setInitialized(true);
        }
    }, [crossmint.jwt, setJwt, storageProvider]);

    useEffect(() => {
        if (crossmint.jwt != null) {
            triggerHasJustLoggedIn();
        }
    }, [crossmint.jwt, triggerHasJustLoggedIn]);

    const logout = () => {
        crossmintAuth.logout();
    };

    const preFetchAndSetOauthUrl = useCallback(async () => {
        try {
            const oauthProviders = Object.keys(initialOAuthUrlMap);

            const oauthPromiseList = oauthProviders.map(async (provider) => {
                const url = await crossmintAuth?.getOAuthUrl(provider as OAuthProvider, {
                    appSchema: resolvedAppSchema,
                });
                return { [provider]: url };
            });

            const oauthUrlMap = Object.assign({}, ...(await Promise.all(oauthPromiseList)));
            setOauthUrlMap(oauthUrlMap);
        } catch (error) {
            console.error(error);
        }
    }, [crossmintAuth]);

    useEffect(() => {
        if (user == null) {
            preFetchAndSetOauthUrl();
        }
    }, [preFetchAndSetOauthUrl, user]);

    const getAuthStatus = (): AuthStatus => {
        if (!initialized) {
            return "initializing";
        }
        if (inProgress) {
            return "in-progress";
        }
        if (crossmint.jwt != null) {
            return "logged-in";
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
        setCrossmintUser(user as User);
    };

    const loginWithOAuth = async (provider: OAuthProvider) => {
        try {
            setInProgress(true);
            const oauthUrl =
                oauthUrlMap[provider] ?? (await crossmintAuth.getOAuthUrl(provider, { appSchema: resolvedAppSchema }));

            await WebBrowser.warmUpAsync();
            const baseUrl = new URL(oauthUrl);
            // Add prompt=select_account for Google OAuth to force account picker
            if (provider === "google") {
                baseUrl.searchParams.append("provider_prompt", "select_account");
            }

            if (Platform.OS === "android") {
                await WebBrowser.openBrowserAsync(baseUrl.toString());
            } else {
                const result = await WebBrowser.openAuthSessionAsync(baseUrl.toString());
                if (result.type === "success") {
                    await createAuthSession(result.url);
                }
            }
            await WebBrowser.coolDownAsync();
        } catch (error) {
            console.error("[CrossmintAuthProvider] Error during OAuth login:", error);
        }
    };

    const createAuthSession = useCallback(
        async (urlOrOneTimeSecret: string) => {
            const oneTimeSecret = urlOrOneTimeSecret.includes("://")
                ? extractOneTimeSecretFromUrl(urlOrOneTimeSecret)
                : urlOrOneTimeSecret;

            if (oneTimeSecret != null) {
                try {
                    setInProgress(true);
                    const authMaterial = await crossmintAuth.handleRefreshAuthMaterial(oneTimeSecret);
                    return authMaterial;
                } catch (error) {
                    throw error;
                } finally {
                    setInProgress(false);
                }
            }
            return null;
        },
        [crossmintAuth]
    );

    return (
        <AuthContext.Provider
            value={{
                crossmintAuth,
                logout,
                jwt: crossmint.jwt,
                user,
                status: getAuthStatus(),
                getUser,
                loginWithOAuth,
                createAuthSession,
            }}
        >
            {children}
        </AuthContext.Provider>
    );
}

const extractOneTimeSecretFromUrl = (url: string): string | undefined => {
    const regex = /[?&]oneTimeSecret=([^&#]+)/;
    const match = url.match(regex);
    const secret = match ? decodeURIComponent(match[1]) : undefined;
    return secret;
};
