import type { ReactNode } from "react";
import {
    CrossmintAuthProvider,
    CrossmintProvider,
    CrossmintWalletProvider,
} from "@crossmint/client-sdk-react-native-ui";
import { Stack } from "expo-router";
import Constants from "expo-constants";

import "../utils/polyfills";

export default function RootLayout() {
    return (
        <CrossmintProviders>
            <Stack />
        </CrossmintProviders>
    );
}

function CrossmintProviders({ children }: { children: ReactNode }) {
    // The scheme is used for deep linking
    const appScheme = Constants.expoConfig?.scheme;

    return (
        <CrossmintProvider apiKey={process.env.EXPO_PUBLIC_CROSSMINT_API_KEY ?? ""} overrideBaseUrl="">
            <CrossmintAuthProvider appSchema={appScheme}>
                <CrossmintWalletProvider>{children}</CrossmintWalletProvider>
            </CrossmintAuthProvider>
        </CrossmintProvider>
    );
}
