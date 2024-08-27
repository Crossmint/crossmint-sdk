import {
    Chain,
    arbitrum,
    arbitrumSepolia,
    base,
    baseSepolia,
    optimism,
    optimismSepolia,
    polygon,
    polygonAmoy,
} from "viem/chains";

import { BlockchainIncludingTestnet as Blockchain, ObjectValues, objectValues } from "@crossmint/common-sdk-base";

export const SmartWalletTestnet = {
    BASE_SEPOLIA: Blockchain.BASE_SEPOLIA,
    POLYGON_AMOY: Blockchain.POLYGON_AMOY,
    OPTIMISM_SEPOLIA: Blockchain.OPTIMISM_SEPOLIA,
    ARBITRUM_SEPOLIA: Blockchain.ARBITRUM_SEPOLIA,
} as const;
export type SmartWalletTestnet = ObjectValues<typeof SmartWalletTestnet>;
export const SMART_WALLET_TESTNETS = objectValues(SmartWalletTestnet);

export const SmartWalletMainnet = {
    BASE: Blockchain.BASE,
    POLYGON: Blockchain.POLYGON,
    OPTIMISM: Blockchain.OPTIMISM,
    ARBITRUM: Blockchain.ARBITRUM,
} as const;
export type SmartWalletMainnet = ObjectValues<typeof SmartWalletMainnet>;
export const SMART_WALLET_MAINNETS = objectValues(SmartWalletMainnet);

export const SmartWalletChain = {
    ...SmartWalletTestnet,
    ...SmartWalletMainnet,
} as const;
export type SmartWalletChain = ObjectValues<typeof SmartWalletChain>;
export const SMART_WALLET_CHAINS = objectValues(SmartWalletChain);

export const viemNetworks: Record<SmartWalletChain, Chain> = {
    polygon: polygon,
    "polygon-amoy": polygonAmoy,
    base: base,
    "base-sepolia": baseSepolia,
    optimism: optimism,
    "optimism-sepolia": optimismSepolia,
    arbitrum: arbitrum,
    "arbitrum-sepolia": arbitrumSepolia,
};
