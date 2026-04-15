import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "../../snippets/01-provider-setup";

export const metadata: Metadata = {
    title: "Wallets - React Playground",
    description: "Create user wallets from your frontend in under 5 minutes",
};

export default function RootLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <html lang="en">
            <body>
                <Providers>{children}</Providers>
            </body>
        </html>
    );
}
