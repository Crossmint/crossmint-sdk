"use client";

import type { ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import { CrossmintAuthProvider, CrossmintProvider } from "@crossmint/client-sdk-react-ui";
import { useWalletConfig, WalletConfigProvider } from "../context/wallet-config";

export function Providers({ children }: { children: ReactNode }) {
    const queryClient = new QueryClient();

    return (
        <QueryClientProvider client={queryClient}>
            <WalletConfigProvider>
                <CrossmintProviders>{children}</CrossmintProviders>
            </WalletConfigProvider>
        </QueryClientProvider>
    );
}

function CrossmintProviders({ children }: { children: ReactNode }) {
    const { walletType } = useWalletConfig();

    console.log({ walletType });

    return (
        <CrossmintProvider apiKey={process.env.NEXT_PUBLIC_CROSSMINT_AUTH_SMART_WALLET_API_KEY ?? ""}>
            <CrossmintAuthProvider
                embeddedWallets={{
                    createOnLogin: "all-users",
                    type: "evm-smart-wallet", // TODO change once SDK supports SSW
                    defaultChain: "polygon-amoy", // TODO change once SDK supports SSW
                }}
                appearance={{
                    borderRadius: "16px",
                    colors: {
                        inputBackground: "#FAF5EC",
                        buttonBackground: "#E9E3D8",
                        border: "#835911",
                        background: "#FAF5EC",
                        textPrimary: "#704130",
                        textSecondary: "#835911",
                        danger: "#ff3333",
                        accent: "#602C1B",
                        textLink: "#1400cb",
                    },
                }}
                authModalTitle="Sign in to Wallet Demo"
                loginMethods={["google", "email", "farcaster", "twitter"]}
            >
                {children}
            </CrossmintAuthProvider>
        </CrossmintProvider>
    );
}
