import type React from "react";
import { createConfig, http, WagmiProvider } from "wagmi";
import {
    arbitrum,
    arbitrumSepolia,
    base,
    baseSepolia,
    optimism,
    optimismSepolia,
    polygon,
    polygonAmoy,
} from "wagmi/chains";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { metaMask, walletConnect } from "wagmi/connectors";

const config = createConfig({
    chains: [base, polygon, optimism, arbitrum, baseSepolia, polygonAmoy, optimismSepolia, arbitrumSepolia],
    connectors: [metaMask(), walletConnect({ projectId: "94ed8f7549329dad7be968888eec3688" })],
    transports: {
        [base.id]: http(),
        [polygon.id]: http(),
        [optimism.id]: http(),
        [arbitrum.id]: http(),
        [baseSepolia.id]: http(),
        [polygonAmoy.id]: http(),
        [optimismSepolia.id]: http(),
        [arbitrumSepolia.id]: http(),
    },
});

export function WagmiAuthProvider({ children }: { children: React.ReactNode }) {
    const queryClient = new QueryClient();

    return (
        <WagmiProvider config={config}>
            <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
        </WagmiProvider>
    );
}
