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
    mainnet,
} from "wagmi/chains";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { metaMask, walletConnect } from "wagmi/connectors";

const ALCHEMY_API_KEY = "-7M6vRDBDknwvMxnqah_jbcieWg0qad9";
const ALCHEMY_RPC_SUBDOMAIN = {
    mainnet: "mainnet",
    polygon: "polygon-mainnet",
    "polygon-amoy": "polygon-amoy",
    base: "base-mainnet",
    "base-sepolia": "base-sepolia",
    optimism: "opt-mainnet",
    "optimism-sepolia": "opt-sepolia",
    arbitrum: "arb-mainnet",
    "arbitrum-sepolia": "arb-sepolia",
};
function getAlchemyRPC(chain: keyof typeof ALCHEMY_RPC_SUBDOMAIN): string {
    return `https://${ALCHEMY_RPC_SUBDOMAIN[chain]}.g.alchemy.com/v2/${ALCHEMY_API_KEY}`;
}

const config = createConfig({
    chains: [mainnet, base, polygon, optimism, arbitrum, baseSepolia, polygonAmoy, optimismSepolia, arbitrumSepolia],
    connectors: [metaMask(), walletConnect({ projectId: "94ed8f7549329dad7be968888eec3688" })],
    transports: {
        [mainnet.id]: http(getAlchemyRPC("mainnet")),
        [base.id]: http(getAlchemyRPC("base")),
        [polygon.id]: http(getAlchemyRPC("polygon")),
        [optimism.id]: http(getAlchemyRPC("optimism")),
        [arbitrum.id]: http(getAlchemyRPC("arbitrum")),
        [baseSepolia.id]: http(getAlchemyRPC("base-sepolia")),
        [polygonAmoy.id]: http(getAlchemyRPC("polygon-amoy")),
        [optimismSepolia.id]: http(getAlchemyRPC("optimism-sepolia")),
        [arbitrumSepolia.id]: http(getAlchemyRPC("arbitrum-sepolia")),
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
