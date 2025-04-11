import { type ReactNode, createContext, useEffect, useMemo, useRef, useState, useCallback } from "react";
import * as WebBrowser from "expo-web-browser";
import { CrossmintAuth, type StorageProvider } from "@crossmint/client-sdk-auth";
import type { AuthMaterialWithUser, SDKExternalUser, OAuthProvider } from "@crossmint/common-sdk-auth";

import { useCrossmint } from "../hooks";
import { SecureStorage } from "../utils/SecureStorage";

type OAuthUrlMap = Record<OAuthProvider, string>;
const initialOAuthUrlMap: OAuthUrlMap = {
    google: "",
    twitter: "",
};

type AuthStatus = "logged-in" | "logged-out" | "in-progress" | "initializing";

type CrossmintAuthProviderProps = {
    prefetchOAuthUrls?: boolean;
    onLoginSuccess?: () => void;
    authModalTitle?: string;
    children: ReactNode;
    refreshRoute?: string;
    logoutRoute?: string;
    customStorageProvider?: StorageProvider;
};

type AuthContextType = {
    crossmintAuth?: CrossmintAuth;
    logout: () => void;
    jwt?: string;
    user?: SDKExternalUser;
    status: AuthStatus;
    getUser: () => void;
    oauthUrlMap: OAuthUrlMap;
    isLoadingOauthUrlMap: boolean;
    loginWithOAuth: (provider: OAuthProvider) => Promise<void>;
};

const defaultContextValue: AuthContextType = {
    crossmintAuth: undefined,
    logout: () => {},
    jwt: undefined,
    user: undefined,
    status: "initializing",
    getUser: () => {},
    oauthUrlMap: initialOAuthUrlMap,
    isLoadingOauthUrlMap: true,
    loginWithOAuth: () => Promise.resolve(),
};

export const AuthContext = createContext<AuthContextType>(defaultContextValue);

export function CrossmintAuthProvider({
    children,
    onLoginSuccess,
    refreshRoute,
    logoutRoute,
    customStorageProvider,
}: CrossmintAuthProviderProps) {
    const [user, setUser] = useState<SDKExternalUser | undefined>(undefined);
    const { crossmint, setJwt } = useCrossmint("CrossmintAuthProvider must be used within CrossmintProvider");
    const [oauthUrlMap, setOauthUrlMap] = useState<OAuthUrlMap>(initialOAuthUrlMap);
    const [isLoadingOauthUrlMap, setIsLoadingOauthUrlMap] = useState(true);
    const crossmintAuthRef = useRef<CrossmintAuth | null>(null);
    const storageProvider = useMemo(() => customStorageProvider || new SecureStorage(), [customStorageProvider]);

    // biome-ignore lint/correctness/useExhaustiveDependencies: crossmint can't be a dependency because it updates with each jwt change
    const crossmintAuth = useMemo(() => {
        if (!crossmintAuthRef.current) {
            const config = {
                callbacks: {
                    onLogout: () => {
                        setJwt(undefined);
                        setUser(undefined);
                    },
                    onTokenRefresh: (authMaterial: AuthMaterialWithUser) => {
                        console.log("[CrossmintAuthProvider] onTokenRefresh", authMaterial);
                        setJwt(authMaterial.jwt);
                        setUser(authMaterial.user);
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

    const [initialized, setInitialized] = useState(false);

    const triggerHasJustLoggedIn = useCallback(() => {
        onLoginSuccess?.();
    }, [onLoginSuccess]);

    useEffect(() => {
        if (crossmint.jwt == null) {
            storageProvider.get("jwt").then((jwt) => {
                if (jwt != null) {
                    console.log("[CrossmintAuthProvider] jwt", jwt);
                    setJwt(jwt);
                }
            });
        }
        setInitialized(true);
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
        setIsLoadingOauthUrlMap(true);
        try {
            const oauthProviders = Object.keys(initialOAuthUrlMap);

            const oauthPromiseList = oauthProviders.map(async (provider) => {
                const url = await crossmintAuth?.getOAuthUrl(provider as OAuthProvider);
                return { [provider]: url };
            });

            const oauthUrlMap = Object.assign({}, ...(await Promise.all(oauthPromiseList)));
            setOauthUrlMap(oauthUrlMap);
        } catch (error) {
            console.error(error);
        } finally {
            setIsLoadingOauthUrlMap(false);
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
    };

    const loginWithOAuth = async (provider: OAuthProvider) => {
        try {
            if (!oauthUrlMap[provider]) {
                console.error(`[CrossmintAuthProvider] OAuth URL for ${provider} is not available`);
                return;
            }

            await WebBrowser.warmUpAsync();
            const baseUrl = new URL(oauthUrlMap[provider]);
            // Add prompt=select_account for Google OAuth to force account picker
            if (provider === "google") {
                baseUrl.searchParams.append("provider_prompt", "select_account");
            }

            const result = await WebBrowser.openAuthSessionAsync(baseUrl.toString());
            if (result.type === "success") {
                const oneTimeSecret = extractOneTimeSecretFromUrl(result.url);
                await crossmintAuth.handleRefreshAuthMaterial(oneTimeSecret);
            }
            await WebBrowser.coolDownAsync();
        } catch (error) {
            console.error("[CrossmintAuthProvider] Error during OAuth login:", error);
        }
    };

    return (
        <AuthContext.Provider
            value={{
                crossmintAuth,
                logout,
                jwt: crossmint.jwt,
                user,
                status: getAuthStatus(),
                getUser,
                oauthUrlMap,
                isLoadingOauthUrlMap,
                loginWithOAuth,
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
