import type React from "react";
import { createConfig, http, WagmiProvider } from "wagmi";
import { mainnet, sepolia } from "wagmi/chains";
// todo: investigate implications of using react-query
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { metaMask, coinbaseWallet, walletConnect } from "wagmi/connectors";

const config = (projectId?: string) =>
    createConfig({
        chains: [mainnet, sepolia],
        connectors: [metaMask(), coinbaseWallet(), ...(projectId ? [walletConnect({ projectId })] : [])],
        transports: {
            [mainnet.id]: http(),
            [sepolia.id]: http(),
        },
    });

const queryClient = new QueryClient();

export function WagmiAuthProvider({
    children,
    walletConnectProjectId,
}: { children: React.ReactNode; walletConnectProjectId?: string }) {
    return (
        <WagmiProvider config={config(walletConnectProjectId)}>
            <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
        </WagmiProvider>
    );
}
