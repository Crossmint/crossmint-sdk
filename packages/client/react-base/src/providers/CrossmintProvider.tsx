import { type ReactNode, createContext, useCallback, useMemo, useRef, useState } from "react";
import { type Crossmint, type CrossmintConfig, createCrossmint } from "@crossmint/common-sdk-base";
import { initReactLogger } from "../logger/init";
import { createLoggerContext } from "./LoggerProvider";
import packageJson from "../../package.json";
export interface CrossmintContext {
    crossmint: Crossmint;
    setJwt: (jwt: string | undefined) => void;
}

export const CrossmintContext = createContext<CrossmintContext | null>(null);

export const LoggerContext = createLoggerContext();

export function CrossmintProvider({
    children,
    apiKey,
    appId,
    extensionId,
    overrideBaseUrl,
}: CrossmintConfig & {
    children: ReactNode;
}) {
    const logger = useMemo(() => {
        return initReactLogger(apiKey, packageJson.name, packageJson.version);
    }, [apiKey]);

    const [version, setVersion] = useState(0);
    const crossmintRef = useRef<Crossmint | null>(null);
    if (crossmintRef.current == null) {
        crossmintRef.current = new Proxy<Crossmint>(createCrossmint({ apiKey, overrideBaseUrl, appId, extensionId }), {
            set(target, prop, value) {
                if (prop === "jwt" && target.jwt !== value) {
                    setVersion((v) => v + 1);
                }
                return Reflect.set(target, prop, value);
            },
        });
    }

    const setJwt = useCallback((jwt: string | undefined) => {
        if (crossmintRef.current == null) {
            throw new Error("CrossmintProvider is not initialized");
        }
        if (jwt !== crossmintRef.current.jwt) {
            crossmintRef.current.jwt = jwt;
        }
    }, []);

    const value = useMemo(() => {
        if (!crossmintRef.current) {
            throw new Error("CrossmintProvider is not initialized");
        }
        return {
            get crossmint() {
                return crossmintRef.current!;
            },
            setJwt,
        };
    }, [setJwt, version]);

    return (
        <LoggerContext.Provider value={logger}>
            <CrossmintContext.Provider value={value}>{children}</CrossmintContext.Provider>
        </LoggerContext.Provider>
    );
}
