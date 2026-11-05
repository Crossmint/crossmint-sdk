import { type ReactNode, createContext, useEffect, useMemo, useState, useCallback } from "react";
import * as WebBrowser from "expo-web-browser";
import Constants from "expo-constants";
import { Platform } from "react-native";
import type { OAuthProvider } from "@crossmint/common-sdk-auth";
import { createPkcePair, type StorageProvider } from "@crossmint/client-sdk-auth";
import { type AuthStatus, CrossmintAuthBaseProvider, useCrossmintAuthBase } from "@crossmint/client-sdk-react-base";
import { useCrossmintAuth, useCrossmint } from "../hooks";
import { SecureStorage } from "../utils/SecureStorage";
import type { RNAuthContext, RNCrossmintAuthProviderProps } from "@/types/auth";

type OAuthUrlMap = Record<OAuthProvider, string | null>;
const initialOAuthUrlMap: OAuthUrlMap = {
    google: null,
    twitter: null,
};

type PrefetchedOAuthLogin = {
    urlByProvider: OAuthUrlMap;
    codeVerifier?: string;
};

const OAUTH_CODE_VERIFIER_KEY = "crossmint-oauth-code-verifier";

const defaultContextValue: RNAuthContext = {
    crossmintAuth: undefined,
    login: () => {},
    logout: async () => {},
    jwt: undefined,
    user: undefined,
    status: "initializing",
    getUser: () => {},
    loginWithOAuth: () => Promise.resolve(),
    createAuthSession: () => Promise.resolve(null),
};

export const AuthContext = createContext<RNAuthContext>(defaultContextValue);

function CrossmintAuthSync({ children }: { children: ReactNode }) {
    const { setJwt } = useCrossmint();
    const { jwt } = useCrossmintAuth();

    useEffect(() => {
        setJwt(jwt);
    }, [setJwt, jwt]);

    return children;
}

function CrossmintAuthProviderContent({
    children,
    appSchema,
    storageProvider,
    usesCustomRefreshRoute,
}: {
    children: ReactNode;
    appSchema?: string | string[];
    storageProvider: StorageProvider;
    usesCustomRefreshRoute: boolean;
}) {
    const baseAuth = useCrossmintAuthBase();
    const [prefetchedOAuthLogin, setPrefetchedOAuthLogin] = useState<PrefetchedOAuthLogin>({
        urlByProvider: initialOAuthUrlMap,
    });
    const [inProgress, setInProgress] = useState(false);

    const singleAppSchema = Array.isArray(appSchema) ? appSchema[0] : appSchema;
    const isRunningInExpoGo =
        Constants.executionEnvironment === "storeClient" ||
        Constants.appOwnership === "expo" ||
        !!Constants.expoVersion;
    const resolvedAppSchema = isRunningInExpoGo ? "exp://127.0.0.1:8081" : singleAppSchema;

    const createPkcePairUnlessCustomRefreshRoute = useCallback(
        () => (usesCustomRefreshRoute ? undefined : createPkcePair()),
        [usesCustomRefreshRoute]
    );

    const preFetchAndSetOauthUrl = useCallback(async () => {
        try {
            const oauthProviders = Object.keys(initialOAuthUrlMap);
            const pkcePair = createPkcePairUnlessCustomRefreshRoute();

            const oauthPromiseList = oauthProviders.map(async (provider) => {
                const url = await baseAuth.crossmintAuth?.getOAuthUrl(provider as OAuthProvider, {
                    appSchema: resolvedAppSchema,
                    codeChallenge: pkcePair?.challenge,
                });
                return { [provider]: url };
            });

            const urlByProvider = Object.assign({}, ...(await Promise.all(oauthPromiseList)));
            setPrefetchedOAuthLogin({ urlByProvider, codeVerifier: pkcePair?.verifier });
        } catch (error) {
            console.error(error);
        }
    }, [baseAuth.crossmintAuth, resolvedAppSchema, createPkcePairUnlessCustomRefreshRoute]);

    const getOAuthLogin = async (provider: OAuthProvider) => {
        const prefetchedUrl = prefetchedOAuthLogin.urlByProvider[provider];
        if (prefetchedUrl != null) {
            return { oauthUrl: prefetchedUrl, codeVerifier: prefetchedOAuthLogin.codeVerifier };
        }

        const pkcePair = createPkcePairUnlessCustomRefreshRoute();
        const oauthUrl = await baseAuth.crossmintAuth?.getOAuthUrl(provider, {
            appSchema: resolvedAppSchema,
            codeChallenge: pkcePair?.challenge,
        });
        return { oauthUrl, codeVerifier: pkcePair?.verifier };
    };

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
            const { oauthUrl, codeVerifier } = await getOAuthLogin(provider);
            if (codeVerifier != null) {
                await storageProvider.set(OAUTH_CODE_VERIFIER_KEY, codeVerifier);
            } else {
                await storageProvider.remove(OAUTH_CODE_VERIFIER_KEY);
            }

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
                    const codeVerifier = await storageProvider.get(OAUTH_CODE_VERIFIER_KEY);
                    const authMaterial = await baseAuth.crossmintAuth?.handleRefreshAuthMaterial(
                        oneTimeSecret,
                        codeVerifier
                    );
                    if (authMaterial != null) {
                        await storageProvider.remove(OAUTH_CODE_VERIFIER_KEY);
                    }
                    return authMaterial;
                } catch (error) {
                    throw error;
                } finally {
                    setInProgress(false);
                }
            }
            return null;
        },
        [baseAuth.crossmintAuth, storageProvider]
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

/**
 * Provides Crossmint authentication to your React Native app: social login (OAuth) and session management.
 * Exposes auth state via the `useCrossmintAuth` hook and stores auth material in secure device storage.
 * Must be nested inside `CrossmintProvider`.
 */
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
            <CrossmintAuthProviderContent
                appSchema={appSchema}
                storageProvider={customStorageProvider}
                usesCustomRefreshRoute={props.refreshRoute != null}
            >
                {children}
            </CrossmintAuthProviderContent>
        </CrossmintAuthBaseProvider>
    );
}

const extractOneTimeSecretFromUrl = (url: string): string | undefined => {
    const regex = /[?&]oneTimeSecret=([^&#]+)/;
    const match = url.match(regex);
    const secret = match ? decodeURIComponent(match[1]) : undefined;
    return secret;
};
