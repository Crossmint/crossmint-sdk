import { useMemo } from "react";
import type { ReactNode } from "react";
import Constants from "expo-constants";
import { CrossmintProvider as BaseCrossmintProvider } from "@crossmint/client-sdk-react-base";
import type { CrossmintConfig } from "@crossmint/common-sdk-base";
import { initReactNativeLogger } from "../logger/init";
import { LoggerContext } from "./LoggerProvider";

export function CrossmintProvider({
    children,
    apiKey,
    overrideBaseUrl,
}: Pick<CrossmintConfig, "apiKey" | "overrideBaseUrl"> & {
    children: ReactNode;
}) {
    const logger = useMemo(() => {
        return initReactNativeLogger(apiKey);
    }, [apiKey]);

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
