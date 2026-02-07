import {
    CrossmintProvider as BaseCrossmintProvider,
    initReactLogger,
    createLoggerContext,
} from "@crossmint/client-sdk-react-base";
import type { CrossmintConfig, LogLevel } from "@crossmint/common-sdk-base";
import packageJson from "../../package.json";
import { useMemo, type ReactNode } from "react";

export const LoggerContext = createLoggerContext();

export interface CrossmintProviderProps extends CrossmintConfig {
    /** @internal */
    children: ReactNode;
    /**
     * Minimum log level for console output.
     * Logs below this level will not be written to the console.
     * Defaults to "debug" (all logs shown) for backward compatibility.
     * Does not affect Datadog logging which receives all logs.
     */
    consoleLogLevel?: LogLevel;
}

export function CrossmintProvider({
    apiKey,
    consoleLogLevel,
    ...props
}: CrossmintProviderProps) {
    const logger = useMemo(() => {
        return initReactLogger(apiKey, packageJson.name, packageJson.version, consoleLogLevel);
    }, [apiKey, consoleLogLevel]);
    return (
        <LoggerContext.Provider value={logger}>
            <BaseCrossmintProvider apiKey={apiKey} {...props} />
        </LoggerContext.Provider>
    );
}
