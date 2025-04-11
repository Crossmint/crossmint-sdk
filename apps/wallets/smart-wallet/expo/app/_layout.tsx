import {
    CrossmintAuthProvider,
    CrossmintProvider,
    CrossmintWalletProvider,
} from "@crossmint/client-sdk-react-native-ui";
import { Stack } from "expo-router";
import type { ReactNode } from "react";

export default function RootLayout() {
    return (
        <CrossmintProviders>
            <Stack />
        </CrossmintProviders>
    );
}

function CrossmintProviders({ children }: { children: ReactNode }) {
    return (
        <CrossmintProvider
            apiKey={process.env.EXPO_PUBLIC_CROSSMINT_API_KEY ?? ""}
            appId={process.env.EXPO_PUBLIC_CROSSMINT_APP_ID ?? ""}
            overrideBaseUrl=""
        >
            <CrossmintAuthProvider>
                <CrossmintWalletProvider>{children}</CrossmintWalletProvider>
            </CrossmintAuthProvider>
        </CrossmintProvider>
    );
}
