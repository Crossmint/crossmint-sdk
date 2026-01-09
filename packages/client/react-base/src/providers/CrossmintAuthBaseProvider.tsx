import { createContext, type ReactNode, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { CrossmintAuth, getCookie, type StorageProvider, getApiKeyPrefix } from "@crossmint/client-sdk-auth";
import { type SDKExternalUser, SESSION_PREFIX } from "@crossmint/common-sdk-auth";
import { useCrossmint } from "../hooks";
import type { AuthStatus, CrossmintAuthBaseContextType } from "@/types";

export const CrossmintAuthBaseContext = createContext<CrossmintAuthBaseContextType | undefined>({
    crossmintAuth: undefined,
    logout: () => {},
    status: "initializing",
    getUser: () => {},
    login: () => {},
});

export function useCrossmintAuthBase(): CrossmintAuthBaseContextType {
    const context = useContext(CrossmintAuthBaseContext);
    if (context == null) {
        throw new Error("useCrossmintAuthBase must be used within CrossmintAuthBaseProvider");
    }
    return context;
}

export interface CrossmintAuthBaseProviderProps {
    children: ReactNode;
    onLoginSuccess?: () => void;
    refreshRoute?: string;
    logoutRoute?: string;
    storageProvider?: StorageProvider;
}

export function CrossmintAuthBaseProvider({
    children,
    onLoginSuccess,
    refreshRoute,
    logoutRoute,
    storageProvider,
}: CrossmintAuthBaseProviderProps) {
    const { crossmint } = useCrossmint("CrossmintAuthBaseProvider must be used within CrossmintProvider");
    const [user, setUser] = useState<SDKExternalUser | undefined>(undefined);
    const [jwt, setJwt] = useState<string | undefined>(undefined);
    const [initialized, setInitialized] = useState(false);

    const crossmintAuthRef = useRef<any | null>(null);
    const previousApiKeyPrefixRef = useRef<string | null>(null);

    // Initialize auth client in useEffect to avoid state updates during render
    useEffect(() => {
        if (!crossmintAuthRef.current) {
            try {
                crossmintAuthRef.current = CrossmintAuth.from(crossmint, {
                    callbacks: {
                        onLogout: () => {
                            setUser(undefined);
                            setJwt(undefined);
                        },
                        onTokenRefresh: (authMaterial) => {
                            setUser(authMaterial.user);
                            setJwt(authMaterial.jwt);
                        },
                    },
                    refreshRoute,
                    logoutRoute,
                    storageProvider,
                });
            } catch (error) {
                console.error("Failed to initialize CrossmintAuth:", error);
            }
        }
    }, [crossmint, refreshRoute, logoutRoute, storageProvider]);

    // Detect API key changes and clear JWT to prevent using a JWT from a different project
    useEffect(() => {
        const currentApiKeyPrefix = getApiKeyPrefix(crossmint.apiKey);

        if (previousApiKeyPrefixRef.current != null && previousApiKeyPrefixRef.current !== currentApiKeyPrefix) {
            // API key changed, clear the JWT state to force re-authentication
            setUser(undefined);
            setJwt(undefined);
            setInitialized(false);
            // Recreate the auth client with the new API key
            crossmintAuthRef.current = null;
        }

        previousApiKeyPrefixRef.current = currentApiKeyPrefix;
    }, [crossmint.apiKey]);

    const crossmintAuth = crossmintAuthRef.current;

    const triggerHasJustLoggedIn = useCallback(() => {
        onLoginSuccess?.();
    }, [onLoginSuccess]);

    useEffect(() => {
        if (jwt == null) {
            if (storageProvider) {
                storageProvider
                    .get?.(SESSION_PREFIX)
                    .then((jwt) => {
                        if (jwt != null) {
                            setJwt(jwt);
                        }
                    })
                    .finally(() => {
                        setInitialized(true);
                    });
            } else {
                try {
                    const jwt = getCookie(SESSION_PREFIX);
                    setJwt(jwt);
                } catch (error) {
                    console.error("Failed to get cookie:", error);
                }
                setInitialized(true);
            }
        } else {
            setInitialized(true);
        }
    }, [jwt, storageProvider]);

    useEffect(() => {
        if (jwt != null) {
            triggerHasJustLoggedIn();
        }
    }, [jwt, triggerHasJustLoggedIn]);

    const logout = useCallback(() => {
        crossmintAuth?.logout();
    }, [crossmintAuth]);

    const getUser = useCallback(async () => {
        if (jwt == null) {
            console.log("User not logged in");
            return;
        }

        const user = await crossmintAuth?.getUser();
        setUser(user);
        return user;
    }, [jwt, crossmintAuth]);

    const getStatus = useCallback((): AuthStatus => {
        if (!initialized) {
            return "initializing";
        }

        return jwt != null ? "logged-in" : "logged-out";
    }, [jwt, initialized]);

    const contextValue = useMemo(
        () => ({
            crossmintAuth,
            logout,
            jwt,
            user,
            status: getStatus(),
            getUser,
            login: () => {},
        }),
        [crossmintAuth, logout, jwt, user, initialized, getUser, getStatus]
    );

    return <CrossmintAuthBaseContext.Provider value={contextValue}>{children}</CrossmintAuthBaseContext.Provider>;
}
