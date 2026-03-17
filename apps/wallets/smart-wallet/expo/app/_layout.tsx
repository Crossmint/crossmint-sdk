import type { ReactNode } from "react";
import {
    CrossmintAuthProvider,
    CrossmintProvider,
    CrossmintWalletProvider,
} from "@crossmint/client-sdk-react-native-ui";
import { NativeDeviceSignerKeyStorage } from "@crossmint/expo-device-signer";
import { Stack } from "expo-router";

import "../utils/polyfills";

const deviceStorage = new NativeDeviceSignerKeyStorage();

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
                    headlessSigningFlow={false}
                    createOnLogin={{ chain: "base-sepolia", recovery: { type: "email" } }}
                    deviceSignerKeyStorage={deviceStorage}
                >
                    {children}
                </CrossmintWalletProvider>
            </CrossmintAuthProvider>
        </CrossmintProvider>
    );
}
