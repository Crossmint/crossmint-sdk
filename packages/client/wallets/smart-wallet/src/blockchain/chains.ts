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
} from "viem/chains";

import { BlockchainIncludingTestnet as Blockchain, type ObjectValues, objectValues } from "@crossmint/common-sdk-base";
import { defineChain } from "viem";
import { story } from "./wallets/definitions/story";

const storyTestnet = defineChain({
    id: 1513,
    name: 'Story Testnet',
    nativeCurrency: {
        decimals: 18,
        name: 'IP',
        symbol: 'IP',
    },
    rpcUrls: {
        default: { http: ['https://testnet.storyrpc.io'] },
    },
    blockExplorers: {
        default: {
            name: 'Story Testnet Explorer',
            url: 'https://testnet.storyscan.xyz',
        },
    },
    testnet: true,
});

export const SmartWalletTestnet = {
    BASE_SEPOLIA: Blockchain.BASE_SEPOLIA,
    POLYGON_AMOY: Blockchain.POLYGON_AMOY,
    OPTIMISM_SEPOLIA: Blockchain.OPTIMISM_SEPOLIA,
    ARBITRUM_SEPOLIA: Blockchain.ARBITRUM_SEPOLIA,
    STORY_TESTNET: Blockchain.STORY_TESTNET,
} as const;
export type SmartWalletTestnet = ObjectValues<typeof SmartWalletTestnet>;
export const SMART_WALLET_TESTNETS = objectValues(SmartWalletTestnet);

export const SmartWalletMainnet = {
    BASE: Blockchain.BASE,
    POLYGON: Blockchain.POLYGON,
    OPTIMISM: Blockchain.OPTIMISM,
    ARBITRUM: Blockchain.ARBITRUM,
    STORY: Blockchain.STORY,
} as const;
export type SmartWalletMainnet = ObjectValues<typeof SmartWalletMainnet>;
export const SMART_WALLET_MAINNETS = objectValues(SmartWalletMainnet);

export const SmartWalletChain = {
    ...SmartWalletTestnet,
    ...SmartWalletMainnet,
} as const;
export type SmartWalletChain = ObjectValues<typeof SmartWalletChain>;
export const SMART_WALLET_CHAINS = objectValues(SmartWalletChain);

export function isTestnetChain(chain: SmartWalletChain): chain is SmartWalletTestnet {
    return (SMART_WALLET_TESTNETS as any).includes(chain);
}

export function isMainnetChain(chain: SmartWalletChain): chain is SmartWalletMainnet {
    return (SMART_WALLET_MAINNETS as any).includes(chain);
}

export const viemNetworks: Record<SmartWalletChain, Chain> = {
    polygon: polygon,
    "polygon-amoy": polygonAmoy,
    base: base,
    "base-sepolia": baseSepolia,
    optimism: optimism,
    "optimism-sepolia": optimismSepolia,
    arbitrum: arbitrum,
    "arbitrum-sepolia": arbitrumSepolia,
    "story-testnet": storyTestnet,
    story: story,
};
