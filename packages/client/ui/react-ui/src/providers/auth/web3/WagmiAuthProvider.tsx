import type React from "react";
import { createConfig, http, WagmiProvider } from "wagmi";
import type { EVMSmartWalletChain } from "@crossmint/client-sdk-smart-wallet";
import {
    type Chain,
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
import { useMemo } from "react";

const defaultChainMapper: Record<EVMSmartWalletChain, Chain> = {
    base,
    polygon,
    optimism,
    arbitrum,
    "base-sepolia": baseSepolia,
    "polygon-amoy": polygonAmoy,
    "optimism-sepolia": optimismSepolia,
    "arbitrum-sepolia": arbitrumSepolia,
};

const config = (defaultChain: EVMSmartWalletChain) =>
    createConfig({
        chains: [defaultChainMapper[defaultChain]],
        connectors: [metaMask(), walletConnect({ projectId: "94ed8f7549329dad7be968888eec3688" })],
        transports: {
            [defaultChainMapper[defaultChain].id]: http(),
        },
    });

export function WagmiAuthProvider({
    children,
    defaultChain,
}: { children: React.ReactNode; defaultChain: EVMSmartWalletChain }) {
    const queryClient = new QueryClient();
    // Memoize the wagmi config to avoid re-creating it on every render
    const wagmiConfig = useMemo(() => config(defaultChain), [defaultChain]);

    return (
        <WagmiProvider config={wagmiConfig}>
            <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
        </WagmiProvider>
    );
}
