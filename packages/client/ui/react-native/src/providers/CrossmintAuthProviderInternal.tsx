import { type ReactNode, createContext, useEffect, useMemo, useState, useCallback } from "react";
import * as WebBrowser from "expo-web-browser";
import type { StorageProvider } from "@crossmint/client-sdk-auth";
import type { AuthMaterialWithUser, SDKExternalUser, OAuthProvider } from "@crossmint/common-sdk-auth";
import { CrossmintAuthBaseProvider, useCrossmintAuthBase, type AuthStatus } from "@crossmint/client-sdk-react-base";
import { SecureStorage } from "../utils/SecureStorage";
import { Platform } from "react-native";
import Constants from "expo-constants";

type OAuthUrlMap = Record<OAuthProvider, string | null>;
const initialOAuthUrlMap: OAuthUrlMap = {
    google: null,
    twitter: null,
};

export type AuthContextType = {
    crossmintAuth?: any;
    logout: () => void;
    jwt?: string;
    user?: SDKExternalUser;
    status: AuthStatus;
    getUser: () => void;
    loginWithOAuth: (provider: OAuthProvider) => Promise<void>;
    createAuthSession: (urlOrOneTimeSecret: string) => Promise<AuthMaterialWithUser | null>;
};

type InternalCrossmintAuthProviderProps = {
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

export function CrossmintAuthProviderInternal({
    children,
    onLoginSuccess,
    refreshRoute,
    logoutRoute,
    customStorageProvider,
    appSchema,
}: InternalCrossmintAuthProviderProps) {
    const storageProvider = useMemo(() => customStorageProvider ?? new SecureStorage(), [customStorageProvider]);

    return (
        <CrossmintAuthBaseProvider
            onLoginSuccess={onLoginSuccess}
            refreshRoute={refreshRoute}
            logoutRoute={logoutRoute}
            storageProvider={storageProvider}
        >
            <CrossmintAuthProviderInternalContent appSchema={appSchema}>
                {children}
            </CrossmintAuthProviderInternalContent>
        </CrossmintAuthBaseProvider>
    );
}

function CrossmintAuthProviderInternalContent({
    children,
    appSchema,
}: {
    children: ReactNode;
    appSchema?: string | string[];
}) {
    const baseAuth = useCrossmintAuthBase();
    const [oauthUrlMap, setOauthUrlMap] = useState<OAuthUrlMap>(initialOAuthUrlMap);
    const [inProgress, setInProgress] = useState(false);

    const singleAppSchema = Array.isArray(appSchema) ? appSchema[0] : appSchema;
    const isRunningInExpoGo =
        Constants.executionEnvironment === "storeClient" ||
        Constants.appOwnership === "expo" ||
        !!Constants.expoVersion;
    const resolvedAppSchema = isRunningInExpoGo ? "exp://127.0.0.1:8081" : singleAppSchema;

    const preFetchAndSetOauthUrl = useCallback(async () => {
        try {
            const oauthProviders = Object.keys(initialOAuthUrlMap);

            const oauthPromiseList = oauthProviders.map(async (provider) => {
                const url = await baseAuth.crossmintAuth?.getOAuthUrl(provider as OAuthProvider, {
                    appSchema: resolvedAppSchema,
                });
                return { [provider]: url };
            });

            const oauthUrlMap = Object.assign({}, ...(await Promise.all(oauthPromiseList)));
            setOauthUrlMap(oauthUrlMap);
        } catch (error) {
            console.error(error);
        }
    }, [baseAuth.crossmintAuth, resolvedAppSchema]);

    useEffect(() => {
        if (baseAuth.user == null) {
            preFetchAndSetOauthUrl();
        }
    }, [preFetchAndSetOauthUrl, baseAuth.user]);

    const getAuthStatus = (): AuthStatus => {
        if (baseAuth.status === "initializing") {
            return "initializing";
        }
        if (inProgress) {
            return "in-progress";
        }
        if (baseAuth.jwt != null) {
            return "logged-in";
        }
        return "logged-out";
    };

    const loginWithOAuth = async (provider: OAuthProvider) => {
        try {
            setInProgress(true);
            const oauthUrl =
                oauthUrlMap[provider] ??
                (await baseAuth.crossmintAuth?.getOAuthUrl(provider, { appSchema: resolvedAppSchema }));

            await WebBrowser.warmUpAsync();
            const baseUrl = new URL(oauthUrl);
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
            throw new Error(`Error during OAuth login: ${error}`);
        } finally {
            setInProgress(false);
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
                    const authMaterial = await baseAuth.crossmintAuth?.handleRefreshAuthMaterial(oneTimeSecret);
                    return authMaterial;
                } catch (error) {
                    throw error;
                } finally {
                    setInProgress(false);
                }
            }
            return null;
        },
        [baseAuth.crossmintAuth]
    );

    return (
        <AuthContext.Provider
            value={{
                crossmintAuth: baseAuth.crossmintAuth,
                logout: baseAuth.logout,
                jwt: baseAuth.jwt,
                user: baseAuth.user,
                status: getAuthStatus(),
                getUser: baseAuth.getUser,
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
