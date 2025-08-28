import { type ReactNode, createContext, useCallback, useMemo, useRef, useState } from "react";
import { type Crossmint, type CrossmintConfig, createCrossmint } from "@crossmint/common-sdk-base";

export interface CrossmintContext {
    crossmint: Crossmint;
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
                return Reflect.set(target, prop, value);
            },
        })
    );

    const setJwt = useCallback((jwt: string | undefined) => {
        if (jwt !== crossmintRef.current.jwt) {
            crossmintRef.current.jwt = jwt;
            if (crossmintRef.current.experimental_customAuth == null) {
                crossmintRef.current.experimental_customAuth = { jwt };
            } else {
                crossmintRef.current.experimental_customAuth.jwt = jwt;
            }
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
