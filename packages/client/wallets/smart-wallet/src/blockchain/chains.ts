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
    polygon: "023d4a21-d801-4450-b629-24439ab1369d",
    "polygon-amoy": "3b24773b-d91e-4c01-8ce5-04807463bbca",
    "base-sepolia": "3eb830c5-f91b-48e0-bb7d-dc30103a60b2",
    base: "5535aa3b-4f9c-45af-9c38-0072369564a3",
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
