import { useEffect } from "react";
import type { ReactNode } from "react";
import Constants from "expo-constants";
import { CrossmintProvider as BaseCrossmintProvider } from "@crossmint/client-sdk-react-base";
import type { CrossmintConfig } from "@crossmint/common-sdk-base";
import { initReactNativeLogger, reactNativeLogger } from "../logger/init";

let loggerInitialized = false;

export function CrossmintProvider({
    children,
    apiKey,
    overrideBaseUrl,
}: Pick<CrossmintConfig, "apiKey" | "overrideBaseUrl"> & {
    children: ReactNode;
}) {
    useEffect(() => {
        if (!loggerInitialized) {
            initReactNativeLogger(apiKey);
            loggerInitialized = true;
            reactNativeLogger.info("react-native.provider.initialized", {
                hasApiKey: apiKey != null,
                hasOverrideBaseUrl: overrideBaseUrl != null,
            });
        }
    }, [apiKey, overrideBaseUrl]);

    // Get app ID from Expo constants
    const appId = Constants.expoConfig?.ios?.bundleIdentifier ?? Constants.expoConfig?.android?.package;

    if (appId != null) {
        reactNativeLogger.debug("react-native.provider.appId", { appId });
    }

    return (
        <BaseCrossmintProvider apiKey={apiKey} appId={appId} overrideBaseUrl={overrideBaseUrl}>
            {children}
        </BaseCrossmintProvider>
    );
}
