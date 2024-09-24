import type { Metadata } from "next";
import { Inter, Raleway } from "next/font/google";

import { cn } from "../lib/utils";
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
        <html
            // Add font variables so they'll be available for tailwind
            className={cn(inter.variable, raleway.variable)}
        >
            <head>
                <title>{metadata.title as string}</title>
            </head>
            <body className="bg-background font-body text-foreground min-h-screen antialiased">
                <main id="main">{children}</main>
            </body>
        </html>
    );
}
