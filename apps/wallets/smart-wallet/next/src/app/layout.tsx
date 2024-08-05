import { Header } from "@/components/header";
import { Metadata } from "next";
import { Inter, Raleway } from "next/font/google";
import React from "react";

import { cn } from "../lib/utils";
import { Providers } from "./_lib/providers";
import "./globals.css";

export const metadata: Metadata = {
    title: "Crossmint Smart Wallet Nextjs Demo",
    description: "Crossmint Smart Wallet Nextjs Demo",
};

const inter = Inter({
    subsets: ["latin"],
    display: "swap",
    variable: "--font-inter",
});

const raleway = Raleway({
    subsets: ["latin"],
    display: "swap",
    variable: "--font-raleway",
});

export default async function RootLayout({ children }: { children: React.ReactNode }) {
    return (
        <Providers>
            <html
                // Add font variables so they'll be available for tailwind
                className={cn(inter.variable, raleway.variable)}
            >
                <head>
                    <title>{metadata.title as string}</title>
                </head>
                <body className="bg-background font-body text-foreground min-h-screen antialiased">
                    <Header />
                    <main id="main">{children}</main>
                </body>
            </html>
        </Providers>
    );
}
