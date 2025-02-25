import { BlockchainIncludingTestnet as Blockchain, objectValues, type ObjectValues } from "@crossmint/common-sdk-base";
import {
    polygon,
    polygonAmoy,
    base,
    baseSepolia,
    optimism,
    optimismSepolia,
    arbitrum,
    arbitrumSepolia,
} from "viem/chains";
import type { Chain } from "viem";

import { story } from "./definitions/story";
import { storyTestnet } from "./definitions/story-testnet";

const SmartWalletTestnet = {
    BASE_SEPOLIA: Blockchain.BASE_SEPOLIA,
    POLYGON_AMOY: Blockchain.POLYGON_AMOY,
    OPTIMISM_SEPOLIA: Blockchain.OPTIMISM_SEPOLIA,
    ARBITRUM_SEPOLIA: Blockchain.ARBITRUM_SEPOLIA,
    STORY_TESTNET: Blockchain.STORY_TESTNET,
} as const;
type SmartWalletTestnet = ObjectValues<typeof SmartWalletTestnet>;
const SMART_WALLET_TESTNETS: readonly SmartWalletChain[] = objectValues(SmartWalletTestnet);

const SmartWalletMainnet = {
    BASE: Blockchain.BASE,
    POLYGON: Blockchain.POLYGON,
    OPTIMISM: Blockchain.OPTIMISM,
    ARBITRUM: Blockchain.ARBITRUM,
    STORY: Blockchain.STORY,
} as const;
type SmartWalletMainnet = ObjectValues<typeof SmartWalletMainnet>;
const SMART_WALLET_MAINNETS: readonly SmartWalletChain[] = objectValues(SmartWalletMainnet);

const SmartWalletChain = {
    ...SmartWalletTestnet,
    ...SmartWalletMainnet,
} as const;

export function isTestnetChain(chain: SmartWalletChain): chain is SmartWalletTestnet {
    return SMART_WALLET_TESTNETS.includes(chain);
}

export function isMainnetChain(chain: SmartWalletChain): chain is SmartWalletMainnet {
    return SMART_WALLET_MAINNETS.includes(chain);
}

export type SmartWalletChain = ObjectValues<typeof SmartWalletChain>;

export const viemNetworks: Record<SmartWalletChain, Chain> = {
    [Blockchain.POLYGON]: polygon,
    [Blockchain.POLYGON_AMOY]: polygonAmoy,
    [Blockchain.BASE]: base,
    [Blockchain.BASE_SEPOLIA]: baseSepolia,
    [Blockchain.OPTIMISM]: optimism,
    [Blockchain.OPTIMISM_SEPOLIA]: optimismSepolia,
    [Blockchain.ARBITRUM]: arbitrum,
    [Blockchain.ARBITRUM_SEPOLIA]: arbitrumSepolia,
    [Blockchain.STORY_TESTNET]: storyTestnet,
    [Blockchain.STORY]: story,
};
