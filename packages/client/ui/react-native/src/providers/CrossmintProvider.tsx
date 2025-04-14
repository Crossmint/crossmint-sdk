import type { ReactNode } from "react";
import Constants from "expo-constants";
import { CrossmintProvider as BaseCrossmintProvider } from "@crossmint/client-sdk-react-base";
import type { Crossmint } from "@crossmint/common-sdk-base";

export function CrossmintProvider({
    children,
    apiKey,
    overrideBaseUrl,
}: Omit<Crossmint, "jwt" | "appId"> & {
    children: ReactNode;
}) {
    // Get app ID from Expo constants
    const appId = Constants.expoConfig?.ios?.bundleIdentifier ?? Constants.expoConfig?.android?.package;

    return (
        <BaseCrossmintProvider apiKey={apiKey} appId={appId} overrideBaseUrl={overrideBaseUrl}>
            {children}
        </BaseCrossmintProvider>
    );
}
