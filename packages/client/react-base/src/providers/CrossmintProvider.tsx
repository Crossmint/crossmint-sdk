import { type ReactNode, createContext, useCallback, useMemo, useRef, useState } from "react";
import { type Crossmint, type CrossmintConfig, type CustomAuth, createCrossmint } from "@crossmint/common-sdk-base";
import isEqual from "lodash.isequal";

export interface CrossmintContext {
    crossmint: Crossmint;
    experimental_setCustomAuth: (customAuthParams?: CustomAuth) => void;
    experimental_customAuth?: CustomAuth;
    /** @deprecated Use experimental_setCustomAuth instead.*/
    setJwt: (jwt: string | undefined) => void;
}

export const CrossmintContext = createContext<CrossmintContext | null>(null);

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
                if (prop === "experimental_customAuth" && target.experimental_customAuth !== value) {
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

    const experimental_setCustomAuth = useCallback((customAuthParams?: CustomAuth) => {
        // Maintains backward compatibility in case crossmint.jwt is being used.
        if (crossmintRef.current.jwt != customAuthParams?.jwt) {
            crossmintRef.current.jwt = customAuthParams?.jwt;
        }
        if (!isEqual(customAuthParams, crossmintRef.current.experimental_customAuth)) {
            crossmintRef.current.experimental_customAuth = customAuthParams;
        }
    }, []);

    const value = useMemo(
        () => ({
            get crossmint() {
                return crossmintRef.current;
            },
            experimental_setCustomAuth,
            experimental_customAuth: crossmintRef.current.experimental_customAuth,
            setJwt,
        }),
        [experimental_setCustomAuth, setJwt, version]
    );

    return <CrossmintContext.Provider value={value}>{children}</CrossmintContext.Provider>;
}
