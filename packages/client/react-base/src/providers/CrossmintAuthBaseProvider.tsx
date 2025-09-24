import {
    createContext,
    type ReactNode,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useRef,
    useState,
    type MouseEvent,
} from "react";
import { useCrossmint } from "../hooks";

export type AuthStatus = "logged-in" | "logged-out" | "in-progress" | "initializing";

export type CrossmintAuthBaseContextType = {
    crossmintAuth?: any;
    login: (defaultEmail?: string | MouseEvent) => void;
    logout: () => void;
    jwt?: string;
    user?: any;
    status: AuthStatus;
    getUser: () => void;
};

export const CrossmintAuthBaseContext = createContext<CrossmintAuthBaseContextType | undefined>(undefined);

export function useCrossmintAuthBase(): CrossmintAuthBaseContextType {
    const context = useContext(CrossmintAuthBaseContext);
    if (!context) {
        throw new Error("useCrossmintAuthBase must be used within CrossmintAuthBaseProvider");
    }
    return context;
}

export interface CrossmintAuthBaseProviderProps {
    children: ReactNode;
    onLoginSuccess?: () => void;
    refreshRoute?: string;
    logoutRoute?: string;
    storageProvider?: any;
}

export function CrossmintAuthBaseProvider({
    children,
    onLoginSuccess,
    refreshRoute,
    logoutRoute,
    storageProvider,
}: CrossmintAuthBaseProviderProps) {
    const { crossmint } = useCrossmint("CrossmintAuthBaseProvider must be used within CrossmintProvider");
    const [user, setUser] = useState<any | undefined>(undefined);
    const [jwt, setJwt] = useState<string | undefined>(undefined);
    const [initialized, setInitialized] = useState(false);

    const crossmintAuthRef = useRef<any | null>(null);
    const crossmintAuth = useMemo(() => {
        if (!crossmintAuthRef.current) {
            try {
                const { CrossmintAuth } = require("@crossmint/client-sdk-auth");
                crossmintAuthRef.current = CrossmintAuth.from(crossmint, {
                    callbacks: {
                        onLogout: () => {
                            setUser(undefined);
                            setJwt(undefined);
                        },
                        onTokenRefresh: (authMaterial: any) => {
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
        return crossmintAuthRef.current;
    }, [crossmint, refreshRoute, logoutRoute, storageProvider]);

    const triggerHasJustLoggedIn = useCallback(() => {
        onLoginSuccess?.();
    }, [onLoginSuccess]);

    useEffect(() => {
        if (jwt == null) {
            if (storageProvider) {
                storageProvider
                    .get?.("crossmint-session")
                    .then((jwt: string) => {
                        if (jwt != null) {
                            setJwt(jwt);
                        }
                    })
                    .finally(() => {
                        setInitialized(true);
                    });
            } else {
                try {
                    const { getCookie } = require("@crossmint/client-sdk-auth");
                    const jwt = getCookie("crossmint-session");
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

    const login = useCallback((defaultEmail?: string | MouseEvent) => {}, []);

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

    const contextValue = useMemo(
        () => ({
            crossmintAuth,
            login,
            logout,
            jwt,
            user,
            status: initialized ? (jwt != null ? "logged-in" : "logged-out") : ("initializing" as AuthStatus),
            getUser,
        }),
        [crossmintAuth, login, logout, jwt, user, initialized, getUser]
    );

    return <CrossmintAuthBaseContext.Provider value={contextValue}>{children}</CrossmintAuthBaseContext.Provider>;
}
