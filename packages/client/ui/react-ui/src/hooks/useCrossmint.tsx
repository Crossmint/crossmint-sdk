import { ReactNode, createContext, useContext, useEffect, useMemo, useRef, useState } from "react";

import { Crossmint, createCrossmint } from "@crossmint/common-sdk-base";

import { SESSION_PREFIX } from "../utils";

const useJwtState = (defaultValue?: string) => {
    const [jwt, setJwt] = useState<string | undefined>(defaultValue);

    useEffect(() => {
        const crossmintSession = document.cookie.split("; ").find((row) => row.startsWith(SESSION_PREFIX));
        if (crossmintSession != null) {
            setJwt(crossmintSession.split("=")[1]);
        }
    }, [document]);

    if (typeof document === "undefined") {
        return { jwt: undefined, setJwt };
    }

    return { jwt, setJwt };
};

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

    const { jwt, setJwt } = useJwtState(createCrossmintParams.jwt);

    const crossmintRef = useRef<Crossmint>(
        new Proxy<Crossmint>(createCrossmint({ ...createCrossmintParams, jwt }), {
            set(target, prop, value) {
                if (prop === "jwt" && target.jwt !== value) {
                    setVersion((v) => v + 1);
                }
                return Reflect.set(target, prop, value);
            },
        })
    );

    useEffect(() => {
        crossmintRef.current.jwt = jwt;
    }, [jwt]);

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
