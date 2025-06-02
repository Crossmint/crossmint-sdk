import { type ReactNode, createContext, useCallback, useContext, useMemo, useRef, useState } from "react";
import { type Crossmint, type CrossmintConfig, type User, createCrossmint } from "@crossmint/common-sdk-base";
import isEqual from "lodash.isequal";

export interface CrossmintContext {
    crossmint: Crossmint;
    setJwt: (jwt: string | undefined) => void;
    setUser: (user: User | undefined) => void;
}

const CrossmintContext = createContext<CrossmintContext | null>(null);

export function CrossmintProvider({
    children,
    apiKey,
    appId,
    overrideBaseUrl,
}: CrossmintConfig & {
    children: ReactNode;
}) {
    const [version, setVersion] = useState(0);

    const crossmintRef = useRef<Crossmint>(
        new Proxy<Crossmint>(createCrossmint({ apiKey, overrideBaseUrl, appId }), {
            set(target, prop, value) {
                if (prop === "jwt" && target.jwt !== value) {
                    setVersion((v) => v + 1);
                }
                return Reflect.set(target, prop, value);
            },
        })
    );

    const setJwt = useCallback((jwt: string | undefined) => {
        if (jwt !== crossmintRef.current.jwt) {
            crossmintRef.current.jwt = jwt;
        }
    }, []);

    const setUser = useCallback((user: User | undefined) => {
        if (user != null && !isEqual(user, crossmintRef.current.user)) {
            crossmintRef.current.user = user;
            crossmintRef.current.jwt = user.jwt;
        }
    }, []);

    const value = useMemo(
        () => ({
            get crossmint() {
                return crossmintRef.current;
            },
            setJwt,
            setUser,
        }),
        [setJwt, setUser, version]
    );

    return <CrossmintContext.Provider value={value}>{children}</CrossmintContext.Provider>;
}

export function useCrossmint(missingContextMessage?: string) {
    const context = useContext(CrossmintContext);
    if (context == null) {
        throw new Error(missingContextMessage ?? "useCrossmint must be used within a CrossmintProvider");
    }
    return context;
}
