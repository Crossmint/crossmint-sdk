import type React from "react";
import { createConfig, http, WagmiProvider } from "wagmi";
import { mainnet, sepolia } from "wagmi/chains";
// todo: investigate implications of using react-query
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { metaMask, walletConnect } from "wagmi/connectors";

const config = createConfig({
    chains: [mainnet, sepolia],
    connectors: [metaMask(), walletConnect({ projectId: "94ed8f7549329dad7be968888eec3688" })],
    transports: {
        [mainnet.id]: http(),
        [sepolia.id]: http(),
    },
});

const queryClient = new QueryClient();

export function WagmiAuthProvider({ children }: { children: React.ReactNode }) {
    return (
        <WagmiProvider config={config}>
            <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
        </WagmiProvider>
    );
}
