import type { ReactNode } from "react";
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

function CrossmintProviders({ children }: { children: ReactNode }) {
    return (
        <CrossmintProvider apiKey={process.env.EXPO_PUBLIC_CROSSMINT_API_KEY ?? ""} overrideBaseUrl="">
            <CrossmintAuthProvider>
                <CrossmintWalletProvider
                    // headlessSigningFlow
                    createOnLogin={{ chain: "base-sepolia", signer: { type: "email" } }}
                >
                    {children}
                </CrossmintWalletProvider>
            </CrossmintAuthProvider>
        </CrossmintProvider>
    );
}
