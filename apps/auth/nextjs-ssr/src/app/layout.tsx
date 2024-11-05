import type { ReactNode } from "react";
import type { Metadata } from "next";
import { Inter, Raleway } from "next/font/google";
import "./globals.css";

export const metadata: Metadata = {
    title: "Crossmint Auth Nextjs Demo",
    description: "Crossmint Auth Nextjs Demo",
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

export default function RootLayout({
    children,
}: Readonly<{
    children: ReactNode;
}>) {
    return (
        <html lang="en">
            <body className={`${inter.variable} ${raleway.variable} antialiased`}>{children}</body>
        </html>
    );
}
