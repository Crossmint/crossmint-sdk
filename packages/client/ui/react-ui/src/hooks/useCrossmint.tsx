import { ReactNode, createContext, useCallback, useContext, useMemo, useRef, useState } from "react";

import { Crossmint, createCrossmint } from "@crossmint/common-sdk-base";

import { getCachedJwt } from "../utils";

export interface CrossmintContext {
    crossmint: Crossmint;
    setJwt: (jwt: string | undefined) => void;
}

const CrossmintContext = createContext<CrossmintContext | null>(null);

export function CrossmintProvider({
    children,
    ...createCrossmintParams
}: { children: ReactNode } & Parameters<typeof createCrossmint>[0]) {
    const [version, setVersion] = useState(0);

    const crossmintRef = useRef<Crossmint>(
        new Proxy<Crossmint>(
            createCrossmint({ ...createCrossmintParams, jwt: createCrossmintParams.jwt ?? getCachedJwt() }),
            {
                set(target, prop, value) {
                    if (prop === "jwt" && target.jwt !== value) {
                        setVersion((v) => v + 1);
                    }
                    return Reflect.set(target, prop, value);
                },
            }
        )
    );

    const setJwt = useCallback((jwt: string | undefined) => {
        if (jwt !== crossmintRef.current.jwt) {
            crossmintRef.current.jwt = jwt;
        }
    }, []);

    const value = useMemo(
        () => ({
            get crossmint() {
                return crossmintRef.current;
            },
            setJwt,
        }),
        [setJwt, version]
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
