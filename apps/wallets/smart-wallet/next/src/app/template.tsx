"use client";

import { Header } from "@/components/header";
import { Toaster } from "@/components/toaster";
import { useEffect, useState } from "react";

import { CrossmintAuthProvider } from "@crossmint/client-sdk-react-ui";

// Reference: https://nextjs.org/docs/app/building-your-application/routing/pages-and-layouts#templates
// Since our home page is located in the root directory, we cannot use a layout component to wrap it.
// This is because the root layout in nextjs is server-side only, and a couple of components are client-side (see below).
// Therefore, we are using a template component to handle client-side components and behaviors.

export default function Template({ children }: { children: React.ReactNode }) {
    const [isMounted, setIsMounted] = useState(false);
    useEffect(() => {
        setIsMounted(true);
    }, []);

    // This is a workaround to prevent a hydration error when using the CrossmintAuthProvider.
    // In theory, this auth provider should be added to the providers.tsx file, but due to that file running initially server-side, it
    // causes a hydration error when the auth modal is opened for whatever reason.
    // Checking for mount here also prevents the auth provider from throwing a "Smart Wallet SDK should only be used client side." error.
    return !isMounted ? (
        <>
            <Header />
            <Toaster />
            {children}
        </>
    ) : (
        <CrossmintAuthProvider
            apiKey={process.env.NEXT_PUBLIC_CROSSMINT_API_KEY ?? ""}
            environment="staging"
            embeddedWallets={{ createOnLogin: "all-users", type: "evm-smart-wallet", defaultChain: "polygon-amoy" }}
        >
            <div>
                <Header />
                <Toaster />
                {children}
            </div>
        </CrossmintAuthProvider>
    );
}
