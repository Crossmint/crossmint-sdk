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
    const expoGoScheme = "exp://127.0.0.1:8081";

    return (
        <CrossmintProvider apiKey={process.env.EXPO_PUBLIC_CROSSMINT_API_KEY ?? ""} overrideBaseUrl="">
            <CrossmintAuthProvider appSchema={expoGoScheme}>
                <CrossmintWalletProvider>{children}</CrossmintWalletProvider>
            </CrossmintAuthProvider>
        </CrossmintProvider>
    );
}
