"use client";

import type { ReactNode } from "react";
import { CrossmintProvider, CrossmintAuthProvider, CrossmintWalletProvider } from "@crossmint/client-sdk-react-ui";
import { ThemeProvider } from "@/lib/theme-context";

export function Providers({ children }: { children: ReactNode }) {
    const clientKey = process.env.NEXT_PUBLIC_CROSSMINT_CLIENT_KEY ?? "";

    if (!clientKey) {
        return (
            <ThemeProvider>
                <div className="flex flex-col items-center justify-center min-h-screen gap-3 text-center px-4">
                    <h1 className="text-xl font-semibold">Configuration Required</h1>
                    <p className="text-sm text-muted-foreground max-w-md">
                        Set <code className="bg-muted px-1.5 py-0.5 rounded text-xs">NEXT_PUBLIC_CROSSMINT_CLIENT_KEY</code> in
                        your <code className="bg-muted px-1.5 py-0.5 rounded text-xs">.env.local</code> file.
                    </p>
                </div>
            </ThemeProvider>
        );
    }

    return (
        <ThemeProvider>
            <CrossmintProvider apiKey={clientKey}>
                <CrossmintAuthProvider authModalTitle="Smart Wallet Controls" loginMethods={["google", "email"]}>
                    <CrossmintWalletProvider
                        showPasskeyHelpers={false}
                        createOnLogin={{
                            chain: "base-sepolia",
                            recovery: { type: "email" },
                        }}
                    >
                        {children}
                    </CrossmintWalletProvider>
                </CrossmintAuthProvider>
            </CrossmintProvider>
        </ThemeProvider>
    );
}
