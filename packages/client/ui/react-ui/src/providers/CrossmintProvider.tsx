import {
    CrossmintProvider as BaseCrossmintProvider,
    initReactLogger,
    createLoggerContext,
} from "@crossmint/client-sdk-react-base";
import type { CrossmintConfig, ConsoleLogLevel } from "@crossmint/common-sdk-base";
import packageJson from "../../package.json";
import { useMemo, type ReactNode } from "react";

export const LoggerContext = createLoggerContext();

export interface CrossmintProviderProps extends CrossmintConfig {
    /**
     * Minimum log level for console output (or "silent" to suppress all output).
     * Logs below this level will not be written to the console.
     * Set to "silent" to completely suppress console output.
     * Defaults to "debug" (all logs shown) for backward compatibility.
     */
    consoleLogLevel?: ConsoleLogLevel;
    /** @internal */
    children: ReactNode;
}

export function CrossmintProvider({ apiKey, consoleLogLevel, ...props }: CrossmintProviderProps) {
    const logger = useMemo(() => {
        return initReactLogger(apiKey, packageJson.name, packageJson.version, consoleLogLevel);
    }, [apiKey, consoleLogLevel]);
    return (
        <LoggerContext.Provider value={logger}>
            <BaseCrossmintProvider apiKey={apiKey} {...props} />
        </LoggerContext.Provider>
    );
}
