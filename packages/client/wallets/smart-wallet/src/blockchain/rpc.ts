import { SmartWalletChain } from "./chains";

const ALCHEMY_API_KEY = "-7M6vRDBDknwvMxnqah_jbcieWg0qad9";

export const ALCHEMY_RPC_SUBDOMAIN: Record<SmartWalletChain, string> = {
    polygon: "polygon-mainnet",
    "polygon-amoy": "polygon-amoy",
    base: "base-mainnet",
    "base-sepolia": "base-sepolia",
    optimism: "opt-mainnet",
    "optimism-sepolia": "opt-sepolia",
    arbitrum: "arb-mainnet",
    "arbitrum-sepolia": "arb-sepolia",
};

export function getAlchemyRPC(chain: SmartWalletChain): string {
    return `https://${ALCHEMY_RPC_SUBDOMAIN[chain]}.g.alchemy.com/v2/${ALCHEMY_API_KEY}`;
}
