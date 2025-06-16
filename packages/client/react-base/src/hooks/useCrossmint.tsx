import { type ReactNode, createContext, useCallback, useContext, useMemo, useRef, useState } from "react";
import { type Crossmint, type CrossmintConfig, type CustomAuth, createCrossmint } from "@crossmint/common-sdk-base";
import isEqual from "lodash.isequal";

export interface CrossmintContext {
    crossmint: Crossmint;
    setJwt: (jwt: string | undefined) => void;
    experimental_setCustomAuth: (experimental_customAuth: CustomAuth | undefined) => void;
}

const CrossmintContext = createContext<CrossmintContext | null>(null);

export function CrossmintProvider({
    children,
    apiKey,
    appId,
    extensionId,
    overrideBaseUrl,
}: CrossmintConfig & {
    children: ReactNode;
}) {
    const [version, setVersion] = useState(0);

    const crossmintRef = useRef<Crossmint>(
        new Proxy<Crossmint>(createCrossmint({ apiKey, overrideBaseUrl, appId, extensionId }), {
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

    const experimental_setCustomAuth = useCallback((experimental_customAuth: CustomAuth | undefined) => {
        if (!isEqual(experimental_customAuth, crossmintRef.current.experimental_customAuth)) {
            crossmintRef.current.experimental_customAuth = experimental_customAuth;
            crossmintRef.current.jwt = experimental_customAuth?.jwt;
        }
    }, []);

    const value = useMemo(
        () => ({
            get crossmint() {
                return crossmintRef.current;
            },
            setJwt,
            experimental_setCustomAuth,
        }),
        [setJwt, experimental_setCustomAuth, version]
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
