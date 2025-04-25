import * as React from "react";
import {
    CrossmintAuthProvider,
    CrossmintProvider,
    CrossmintWalletProvider,
} from "@crossmint/client-sdk-react-native-ui";
import { Stack } from "expo-router";

import "../utils/polyfills";

export default function RootLayout() {
    return (
        <CrossmintProviders>
            <Stack />
        </CrossmintProviders>
    );
}

function CrossmintProviders({ children }: { children: React.ReactNode }) {
    return (
        <CrossmintProvider apiKey={process.env.EXPO_PUBLIC_CROSSMINT_API_KEY ?? ""} overrideBaseUrl="">
            <CrossmintAuthProvider>
                <CrossmintWalletProvider useRecoveryKey={true} secureEndpointUrl="http://localhost:54825">
                    {children}
                </CrossmintWalletProvider>
            </CrossmintAuthProvider>
        </CrossmintProvider>
    );
}
