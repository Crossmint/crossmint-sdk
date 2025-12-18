import { useMemo } from "react";
import type { ReactNode } from "react";
import Constants from "expo-constants";
import { CrossmintProvider as BaseCrossmintProvider, createLoggerContext } from "@crossmint/client-sdk-react-base";
import type { CrossmintConfig } from "@crossmint/common-sdk-base";
import { initReactNativeLogger } from "../logger/init";

export const LoggerContext = createLoggerContext();

export function CrossmintProvider({
    children,
    apiKey,
    overrideBaseUrl,
    loggingConsent,
}: Pick<CrossmintConfig, "apiKey" | "overrideBaseUrl" | "loggingConsent"> & {
    children: ReactNode;
}) {
    const logger = useMemo(() => {
        return initReactNativeLogger(apiKey, loggingConsent);
    }, [apiKey, loggingConsent]);

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
