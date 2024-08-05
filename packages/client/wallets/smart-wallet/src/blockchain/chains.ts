import { BUNDLER_RPC } from "@/utils/constants";
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

export const zerodevProjects: Record<SmartWalletChain, string> = {
    polygon: "5c9f4865-ca8e-44bb-9b9e-3810b2b46f9f",
    "polygon-amoy": "3deef404-ca06-4a5d-9a58-907c99e7ef00",
    "base-sepolia": "5a127978-6473-4784-9dfb-f74395b220a6",
    base: "e8b3020f-4dde-4176-8a7d-be8102527a5c",
    "optimism-sepolia": "f8dd488e-eaed-467d-a5de-0184c160f3b1",
    optimism: "505950ab-ee07-4a9c-bd16-320ac71a9350",
    arbitrum: "a965100f-fedf-4e6b-a207-20f5687fcc4f",
    "arbitrum-sepolia": "76c860ca-af77-4fb1-8eac-07825952f6f4",
};

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

export const getBundlerRPC = (chain: SmartWalletChain) => {
    return BUNDLER_RPC + zerodevProjects[chain];
};
