"use client";

import { Header } from "@/components/header";
import { Toaster } from "@/components/toaster";
import type { ReactNode } from "react";

import { Providers } from "./_lib/providers";

// Using a template file is a workaround for the rendering issue:
// Templates create new instances for each child on navigation, unlike layouts.
// This forces a re-render of components, potentially avoiding the development server hang.
// The issue occurs when combining Server Components, Client Providers, and Tailwind.
// For more details, see the issue on Next.js Github: https://github.com/vercel/next.js/issues/69682
export default function Template({ children }: { children: ReactNode }) {
    return (
        <Providers>
            <Header />
            <Toaster />
            {children}
        </Providers>
    );
}
