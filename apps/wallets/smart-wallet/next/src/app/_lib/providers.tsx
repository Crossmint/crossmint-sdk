"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";

import { CrossmintAuthProvider, CrossmintProvider } from "@crossmint/client-sdk-react-ui";

export function Providers({ children }: { children: ReactNode }) {
    const queryClient = new QueryClient();

    return (
        <QueryClientProvider client={queryClient}>
            <CrossmintProvider apiKey={process.env.NEXT_PUBLIC_CROSSMINT_AUTH_SMART_WALLET_API_KEY ?? ""}>
                <CrossmintAuthProvider
                    embeddedWallets={{
                        createOnLogin: "all-users",
                        type: "evm-smart-wallet",
                        defaultChain: "polygon-amoy",
                    }}
                    appearance={{
                        spacingUnit: "8px",
                        borderRadius: "16px",
                        colors: {
                            inputBackground: "#fffdf9",
                            buttonBackground: "#fffaf2",
                            border: "#835911",
                            background: "#FAF5EC",
                            textPrimary: "#5f2c1b",
                            textSecondary: "#835911",
                            danger: "#ff3333",
                            accent: "#602C1B",
                        },
                    }}
                    loginMethods={["google", "email", "farcaster", "web3"]}
                    walletConnectProjectId={process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID ?? ""}
                >
                    {children}
                </CrossmintAuthProvider>
            </CrossmintProvider>
        </QueryClientProvider>
    );
}
