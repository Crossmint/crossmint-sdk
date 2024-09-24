import type { ReactNode } from "react";

import { useCrossmintWalletConnect } from "../../../hooks/useCrossmintWalletConnect";

export default function RootLayout({ children }: { children: ReactNode }) {
    const { uiConfig } = useCrossmintWalletConnect();

    return (
        <div
            className="flex items-center justify-center w-full h-screen p-6"
            style={{
                backgroundColor: uiConfig.colors.background,
            }}
        >
            {children}
        </div>
    );
}
