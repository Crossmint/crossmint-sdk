"use client";

import { Header } from "@/components/header";
import { Toaster } from "@/components/toaster";
import { useEffect, useState } from "react";

import { CrossmintAuthProvider, CrossmintProvider } from "@crossmint/client-sdk-react-ui";

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
        <CrossmintProvider apiKey={process.env.NEXT_PUBLIC_CROSSMINT_API_KEY ?? ""}>
            <CrossmintAuthProvider
                embeddedWallets={{ createOnLogin: "all-users", type: "evm-smart-wallet", defaultChain: "polygon-amoy" }}
                appearance={{
                    // @ts-expect-error todo get appLogo/appName from crossmint console db
                    appLogo:
                        "data:image/svg+xml,%3Csvg width='54' height='54' viewBox='0 0 54 54' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cg clip-path='url(%23clip0_943_5959)'%3E%3Cg mask='url(%23mask0_943_5959)'%3E%3Cpath d='M37.4524 32.0941C37.667 29.8149 37.9884 23.7472 37.2069 22.4355C36.4255 21.1239 33.3215 19.8823 31.0453 20.5031C28.7691 21.1239 27.9414 22.7793 27.9414 25.8832C27.9414 28.9871 27.9414 32.9187 28.5622 33.7465C29.183 34.5742 32.823 34.7811 33.5285 33.7465C34.2339 32.7118 35.5977 26.504 35.5977 24.4347' stroke='%23602C1B' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round'%3E%3C/path%3E%3Cpath d='M29.7769 21.0475C28.5608 20.2961 25.3567 19.9367 23.7513 21.0475C22.146 22.1584 21.3183 23.8139 21.9391 27.1247C22.5599 30.4356 23.1005 33.9533 24.0718 34.781C25.043 35.6087 28.1803 35.682 29.1982 34.4038' stroke='%23602C1B' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round'%3E%3C/path%3E%3Cpath d='M22.5578 22.1931C21.1112 21.7446 19.042 21.7447 17.5935 22.7793C16.145 23.814 15.3173 25.2625 16.5588 28.7803C17.8004 32.298 18.4812 34.394 19.6928 35.2083C20.9043 36.0226 23.3073 35.6089 24.0716 34.7812' stroke='%23602C1B' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round'%3E%3C/path%3E%3Cpath d='M16.5491 23.792C15.7326 22.5723 14.0598 20.439 12.7716 16.9352C11.8009 14.2953 9.73159 13.4674 8.07616 15.5367C6.42074 17.606 8.01611 21.0801 9.49463 23.792C10.9732 26.5039 13.6633 30.2286 14.698 31.2632C15.3187 34.781 14.5083 37.4718 15.9545 39.9509C18.0087 43.472 22.1474 43.8858 26.079 42.8512C28.7691 42.4374 31.0453 44.0928 34.77 43.8858C38.4947 43.6789 39.7363 39.7473 41.3917 37.4711C43.0471 35.1949 45.9441 32.5048 47.1857 31.0563C48.4272 29.6078 48.0134 27.5385 46.5649 26.9178C45.1164 26.297 43.8582 26.5151 42.2194 28.1593C40.6806 29.7032 39.3224 31.884 39.3224 31.884C39.3224 31.884 36.8393 31.4702 34.5631 32.2979C32.0052 33.228 30.0106 34.3672 28.3552 36.8503' stroke='%23602C1B' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round'%3E%3C/path%3E%3C/g%3E%3C/g%3E%3Cdefs%3E%3CclipPath id='clip0_943_5959'%3E%3Crect width='54' height='54' fill='white' transform='translate(0.660156)'%3E%3C/rect%3E%3C/clipPath%3E%3C/defs%3E%3C/svg%3E",
                    appName: "Nike",
                    spacingUnit: "8px",
                    fontSizeUnit: "16px",
                    borderRadius: "12px",
                    colors: {
                        inputBackground: "#fffdf9",
                        buttonBackground: "#fffaf2",
                        border: "#9a9a9a",
                        background: "#FAF5EC",
                        textPrimary: "#5f2c1b",
                        textSecondary: "#835911",
                        danger: "#ff3333",
                        accent: "#602C1B",
                    },
                }}
            >
                <div>
                    <Header />
                    <Toaster />
                    {children}
                </div>
            </CrossmintAuthProvider>
        </CrossmintProvider>
    );
}
