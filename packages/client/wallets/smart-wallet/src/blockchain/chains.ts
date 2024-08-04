import { BUNDLER_RPC } from "@/utils/constants";
import { Chain, base, baseSepolia, polygon, polygonAmoy } from "viem/chains";

import { BlockchainIncludingTestnet as Blockchain, ObjectValues, objectValues } from "@crossmint/common-sdk-base";

export const SmartWalletTestnet = {
    BASE_SEPOLIA: Blockchain.BASE_SEPOLIA,
    POLYGON_AMOY: Blockchain.POLYGON_AMOY,
} as const;
export type SmartWalletTestnet = ObjectValues<typeof SmartWalletTestnet>;
export const SMART_WALLET_TESTNETS = objectValues(SmartWalletTestnet);

export const SmartWalletMainnet = {
    BASE: Blockchain.BASE,
    POLYGON: Blockchain.POLYGON,
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
    "polygon-amoy": "96021f51-61b7-4385-b57f-e81f3f4c4f70",
    "base-sepolia": "5a127978-6473-4784-9dfb-f74395b220a6",
    base: "e8b3020f-4dde-4176-8a7d-be8102527a5c",
};

export const viemNetworks: Record<SmartWalletChain, Chain> = {
    polygon: polygon,
    "polygon-amoy": polygonAmoy,
    base: base,
    "base-sepolia": baseSepolia,
};

export const getBundlerRPC = (chain: SmartWalletChain) => {
    return BUNDLER_RPC + zerodevProjects[chain];
};
