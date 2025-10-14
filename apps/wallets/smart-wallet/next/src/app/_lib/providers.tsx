"use client";

import type { ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import {
    CrossmintAuthProvider,
    CrossmintProvider,
    CrossmintWalletProvider,
    type LoginMethod,
} from "@crossmint/client-sdk-react-ui";
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

    let web3LoginMethod: LoginMethod = "web3";
    if (walletType === "evm-smart-wallet") {
        web3LoginMethod = "web3:evm-only";
    } else if (walletType === "solana-smart-wallet") {
        web3LoginMethod = "web3:solana-only";
    }
    return (
        <CrossmintProvider apiKey={process.env.NEXT_PUBLIC_CROSSMINT_API_KEY ?? ""}>
            <CrossmintAuthProvider
                appearance={{
                    borderRadius: "24px",
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
                loginMethods={["google", "email", "farcaster", "twitter", web3LoginMethod]}
            >
                <CrossmintWalletProvider
                    showPasskeyHelpers={false}
                    createOnLogin={{
                        chain: walletType === "solana-smart-wallet" ? "solana" : (process.env.NEXT_PUBLIC_CHAIN as any),
                        signer: { type: "api-key" },
                        onCreateConfig: {
                            adminSigner: { type: "api-key" },
                        },
                    }}
                >
                    {children}
                </CrossmintWalletProvider>
            </CrossmintAuthProvider>
        </CrossmintProvider>
    );
}
