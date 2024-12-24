import { blockchainToChainId } from "@crossmint/common-sdk-base";

import type { SmartWalletChain } from "./chains";

const ALCHEMY_API_KEY = "-7M6vRDBDknwvMxnqah_jbcieWg0qad9";
const PIMLICO_API_KEY = "pim_9dKmQPxiTCvtbUNF7XFBbA";

const MODE_RPC = "https://mainnet.mode.network/";
const MODE_SEPOLIA_RPC = "https://sepolia.mode.network/";

export const ALCHEMY_RPC_SUBDOMAIN: Partial<Record<SmartWalletChain, string>> = {
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
    if (chain === "mode") {
        return MODE_RPC;
    }
    if (chain === "mode-sepolia") {
        return MODE_SEPOLIA_RPC;
    }
    return `https://${ALCHEMY_RPC_SUBDOMAIN[chain]}.g.alchemy.com/v2/${ALCHEMY_API_KEY}`;
}

export function getPimlicoBundlerRPC(chain: SmartWalletChain): string {
    return `https://api.pimlico.io/v2/${blockchainToChainId(chain)}/rpc?apikey=${PIMLICO_API_KEY}`;
}
