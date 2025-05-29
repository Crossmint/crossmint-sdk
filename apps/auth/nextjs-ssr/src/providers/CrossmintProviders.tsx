"use client";

import type { ReactNode } from "react";
import { CrossmintProvider, CrossmintAuthProvider, CrossmintWalletProvider } from "@crossmint/client-sdk-react-ui";

export default function CrossmintProviders({ children }: { children: ReactNode }) {
    return (
        <CrossmintProvider apiKey={process.env.NEXT_PUBLIC_CLIENT_CROSSMINT_API_KEY ?? ""}>
            <CrossmintAuthProvider
                loginMethods={["email", "google"]} // Only show email and Google login methods
                refreshRoute="/api/refresh"
                logoutRoute="/api/logout"
            >
                <CrossmintWalletProvider>{children}</CrossmintWalletProvider>
            </CrossmintAuthProvider>
        </CrossmintProvider>
    );
}
