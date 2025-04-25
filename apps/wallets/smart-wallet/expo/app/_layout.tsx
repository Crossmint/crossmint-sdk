import {
    CrossmintAuthProvider,
    CrossmintProvider,
    CrossmintWalletProvider,
} from "@crossmint/client-sdk-react-native-ui";
import { Stack } from "expo-router";
import type { ReactNode } from "react";

import "../utils/polyfills";

export default function RootLayout() {
    return (
        <CrossmintProviders>
            <Stack />
        </CrossmintProviders>
    );
}

function CrossmintProviders({ children }: { children: ReactNode }) {
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
