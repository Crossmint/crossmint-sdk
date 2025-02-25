import { blockchainToChainId } from "@crossmint/common-sdk-base";

import { viemNetworks, type SmartWalletChain } from "./chains";

const ALCHEMY_API_KEY = "-7M6vRDBDknwvMxnqah_jbcieWg0qad9";
const PIMLICO_API_KEY = "pim_9dKmQPxiTCvtbUNF7XFBbA";

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
    return `https://${ALCHEMY_RPC_SUBDOMAIN[chain]}.g.alchemy.com/v2/${ALCHEMY_API_KEY}`;
}

export function getRPC(chain: SmartWalletChain): string {
    if (chain === "story-testnet" || chain === "story") {
        // Story is not supported by Alchemy yet
        return viemNetworks[chain].rpcUrls.default.http[0];
    }
    return getAlchemyRPC(chain);
}

export function getPimlicoBundlerRPC(chain: SmartWalletChain): string {
    return `https://api.pimlico.io/v2/${blockchainToChainId(chain)}/rpc?apikey=${PIMLICO_API_KEY}`;
}
