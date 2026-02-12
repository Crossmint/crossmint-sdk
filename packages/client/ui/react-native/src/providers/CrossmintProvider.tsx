import { useMemo } from "react";
import type { ReactNode } from "react";
import Constants from "expo-constants";
import { CrossmintProvider as BaseCrossmintProvider, createLoggerContext } from "@crossmint/client-sdk-react-base";
import type { CrossmintConfig, LogLevel } from "@crossmint/common-sdk-base";
import { initReactNativeLogger } from "../logger/init";

export const LoggerContext = createLoggerContext();

export interface CrossmintProviderProps extends Pick<CrossmintConfig, "apiKey" | "overrideBaseUrl"> {
    /**
     * Minimum log level for console output.
     * Logs below this level will not be written to the console.
     * Defaults to "debug" (all logs shown) for backward compatibility.
     * Does not affect Datadog logging which receives all logs.
     */
    consoleLogLevel?: LogLevel;
    /** @internal */
    children: ReactNode;
}

/**
 * Root provider for the Crossmint SDK. Must wrap your entire application.
 * Initializes the SDK with your API key and sets up logging.
 */
export function CrossmintProvider({ children, apiKey, overrideBaseUrl, consoleLogLevel }: CrossmintProviderProps) {
    const logger = useMemo(() => {
        return initReactNativeLogger(apiKey, consoleLogLevel);
    }, [apiKey, consoleLogLevel]);

    // Get app ID from Expo constants
    const appId = Constants.expoConfig?.ios?.bundleIdentifier ?? Constants.expoConfig?.android?.package;

    return (
        <LoggerContext.Provider value={logger}>
            <BaseCrossmintProvider apiKey={apiKey} appId={appId} overrideBaseUrl={overrideBaseUrl}>
                {children}
            </BaseCrossmintProvider>
        </LoggerContext.Provider>
    );
}
