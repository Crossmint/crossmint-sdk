import { type ReactNode, createContext, useEffect, useMemo, useRef, useState, useCallback } from "react";
import { Linking } from "react-native";

import { CrossmintAuth } from "@crossmint/client-sdk-auth";
import type { AuthMaterialWithUser, SDKExternalUser, OAuthProvider } from "@crossmint/common-sdk-auth";

import { useCrossmint } from "../hooks";
import { useGlobalSearchParams } from "expo-router";

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
    linkedURL: string | null;
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
    linkedURL: null,
};

export const AuthContext = createContext<AuthContextType>(defaultContextValue);

type SearchParams = {
    oneTimeSecret?: string;
};

export function CrossmintAuthProvider({
    children,
    onLoginSuccess,
    refreshRoute,
    logoutRoute,
}: CrossmintAuthProviderProps) {
    const { oneTimeSecret } = useGlobalSearchParams<SearchParams>();
    const [oneTimeSecretTwo, setOneTimeSecretTwo] = useState<string | undefined>(undefined);
    const { linkedURL, resetURL } = useDeepLinkURL();
    const [user, setUser] = useState<SDKExternalUser | undefined>(undefined);
    const { crossmint, setJwt } = useCrossmint("CrossmintAuthProvider must be used within CrossmintProvider");
    const [oauthUrlMap, setOauthUrlMap] = useState<OAuthUrlMap>(initialOAuthUrlMap);
    const [isLoadingOauthUrlMap, setIsLoadingOauthUrlMap] = useState(true);
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

    const [initialized, setInitialized] = useState(false);

    const triggerHasJustLoggedIn = useCallback(() => {
        onLoginSuccess?.();
    }, [onLoginSuccess]);

    useEffect(() => {
        if (crossmint.jwt == null) {
            const jwt = "";
            setJwt(jwt);
        }
        setInitialized(true);
    }, [crossmint.jwt, setJwt]);

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

    const extractOneTimeSecretFromUrl = (url: string): string | undefined => {
        const regex = /[?&]oneTimeSecret=([^&]+)/; // Use the refined regex
        const match = url.match(regex);
        return match ? decodeURIComponent(match[1]) : undefined;
    };

    useEffect(() => {
        console.log("[CrossmintAuthProvider] linkedURL", linkedURL);
        if (linkedURL) {
            const oneTimeSecret = extractOneTimeSecretFromUrl(linkedURL);
            if (oneTimeSecret) {
                setOneTimeSecretTwo(oneTimeSecret);
                // resetURL();
            }
        }
    }, [linkedURL]);

    useEffect(() => {
        if (oneTimeSecret) {
            console.log("[CrossmintAuthProvider] easy oneTimeSecret", oneTimeSecret);
        }
    }, [oneTimeSecret]);

    useEffect(() => {
        if (oneTimeSecret) {
            console.log("[CrossmintAuthProvider] oneTimeSecret state updated:", oneTimeSecret);
            // Use oneTimeSecret as needed (e.g., call an auth function)
            // Consider clearing it after use: setOneTimeSecret(undefined);
        }
    }, [oneTimeSecret]);

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
                linkedURL,
            }}
        >
            {children}
        </AuthContext.Provider>
    );
}

export function useDeepLinkURL() {
    const [linkedURL, setLinkedURL] = useState<string | null>(null);

    // 1. If the app is not already open, it is opened and the url is passed in as the initialURL
    // You can handle these events with Linking.getInitialURL(url) -- it returns a Promise that
    // resolves to the url, if there is one.
    useEffect(() => {
        const getUrlAsync = async () => {
            // Get the deep link used to open the app
            const initialUrl = await Linking.getInitialURL();
            console.log("[CrossmintAuthProvider useDeepLinkURL] Getting initial URL", initialUrl);
            if (initialUrl != null) {
                setLinkedURL(decodeURI(initialUrl));
            }
        };

        getUrlAsync();
    }, []);

    // 2. If the app is already open, the app is foregrounded and a Linking event is fired
    // You can handle these events with Linking.addEventListener(url, callback)
    useEffect(() => {
        const callback = ({ url }: { url: string }) => {
            console.log("[CrossmintAuthProvider useDeepLinkURL] Linking event listener fired:", url);
            setLinkedURL(decodeURI(url));
        };
        console.log("[CrossmintAuthProvider useDeepLinkURL] Adding event listener");
        const subscription = Linking.addEventListener("url", callback);
        return () => {
            console.log("[CrossmintAuthProvider useDeepLinkURL] Removing event listener");
            subscription.remove();
        };
    }, []);

    const resetURL = () => setLinkedURL(null);

    return { linkedURL, resetURL };
}
