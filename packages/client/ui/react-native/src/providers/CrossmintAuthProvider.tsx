import { type ReactNode, createContext, useEffect, useMemo, useState, useCallback } from "react";
import * as WebBrowser from "expo-web-browser";
import Constants from "expo-constants";
import { Platform } from "react-native";
import type { OAuthProvider } from "@crossmint/common-sdk-auth";
import { type AuthStatus, CrossmintAuthBaseProvider, useCrossmintAuthBase } from "@crossmint/client-sdk-react-base";
import { useAuth, useCrossmint } from "../hooks";
import { SecureStorage } from "../utils/SecureStorage";
import type { RNAuthContext, RNCrossmintAuthProviderProps } from "@/types/auth";

type OAuthUrlMap = Record<OAuthProvider, string | null>;
const initialOAuthUrlMap: OAuthUrlMap = {
    google: null,
    twitter: null,
};

const defaultContextValue: RNAuthContext = {
    crossmintAuth: undefined,
    login: () => {},
    logout: () => {},
    jwt: undefined,
    user: undefined,
    status: "initializing",
    getUser: () => {},
    loginWithOAuth: () => Promise.resolve(),
    createAuthSession: () => Promise.resolve(null),
};

export const AuthContext = createContext<RNAuthContext>(defaultContextValue);

function CrossmintAuthSync({ children }: { children: ReactNode }) {
    const { experimental_setCustomAuth, experimental_customAuth } = useCrossmint();
    const { user, jwt } = useAuth();

    useEffect(() => {
        if (jwt == null && experimental_customAuth?.jwt != null) {
            experimental_setCustomAuth(undefined);
        }
        if (jwt != null) {
            experimental_setCustomAuth({
                jwt,
                email: user?.email,
            });
        }
    }, [experimental_setCustomAuth, jwt, user]);

    return children;
}

function CrossmintAuthProviderContent({
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
                login: () => {},
                loginWithOAuth,
                createAuthSession,
            }}
        >
            <CrossmintAuthSync>{children}</CrossmintAuthSync>
        </AuthContext.Provider>
    );
}

export function CrossmintAuthProvider({ children, ...props }: RNCrossmintAuthProviderProps) {
    const appSchema = props.appSchema ?? Constants.expoConfig?.scheme;
    const customStorageProvider = useMemo(() => props.storageProvider ?? new SecureStorage(), [props.storageProvider]);

    return (
        <CrossmintAuthBaseProvider
            onLoginSuccess={props.onLoginSuccess}
            refreshRoute={props.refreshRoute}
            logoutRoute={props.logoutRoute}
            storageProvider={customStorageProvider}
        >
            <CrossmintAuthProviderContent appSchema={appSchema}>{children}</CrossmintAuthProviderContent>
        </CrossmintAuthBaseProvider>
    );
}

const extractOneTimeSecretFromUrl = (url: string): string | undefined => {
    const regex = /[?&]oneTimeSecret=([^&#]+)/;
    const match = url.match(regex);
    const secret = match ? decodeURIComponent(match[1]) : undefined;
    return secret;
};
