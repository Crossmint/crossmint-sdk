import { BlockchainIncludingTestnet as Blockchain } from "@crossmint/common-sdk-base";
import type { Chain as ViemChain } from "viem";
import {
    baseSepolia,
    base,
    polygonAmoy,
    polygon,
    optimismSepolia,
    optimism,
    arbitrumSepolia,
    arbitrum,
    arbitrumNova,
    modeTestnet,
    mode,
    bsc,
    shape,
    zora,
    zoraSepolia,
    sepolia,
    flowMainnet,
    flowTestnet,
    plume,
    plumeTestnet,
} from "viem/chains";

import { arcTestnet } from "./definitions/arcTestnet";
import { story } from "./definitions/story";
import { storyTestnet } from "./definitions/storyTestnet";
import { tempoTestnet } from "./definitions/tempoTestnet";

const TESTNET_AA_CHAINS = [
    Blockchain.ABSTRACT_TESTNET,
    Blockchain.ARBITRUM_SEPOLIA,
    Blockchain.BASE_SEPOLIA,
    Blockchain.CURTIS,
    Blockchain.ETHEREUM_SEPOLIA,
    Blockchain.FLOW_TESTNET,
    Blockchain.MANTLE_SEPOLIA,
    Blockchain.MODE_SEPOLIA,
    Blockchain.OPTIMISM_SEPOLIA,
    Blockchain.PLUME_TESTNET,
    Blockchain.POLYGON_AMOY,
    Blockchain.SCROLL_SEPOLIA,
    Blockchain.SEI_ATLANTIC_2_TESTNET,
    Blockchain.STORY_TESTNET,
    Blockchain.WORLD_CHAIN_SEPOLIA,
    Blockchain.ZORA_SEPOLIA,
    Blockchain.ARC_TESTNET,
    Blockchain.TEMPO_TESTNET,
] as const;

const PRODUCTION_AA_CHAINS = [
    Blockchain.ABSTRACT,
    Blockchain.APECHAIN,
    Blockchain.ARBITRUM,
    Blockchain.ARBITRUMNOVA,
    Blockchain.BASE,
    Blockchain.BSC,
    Blockchain.FLOW,
    Blockchain.MANTLE,
    Blockchain.MODE,
    Blockchain.OPTIMISM,
    Blockchain.PLUME,
    Blockchain.POLYGON,
    Blockchain.SCROLL,
    Blockchain.SEI_PACIFIC_1,
    Blockchain.SHAPE,
    Blockchain.STORY,
    Blockchain.WORLDCHAIN,
    Blockchain.ZORA,
] as const;

export type EVMSmartWalletTestnet = (typeof TESTNET_AA_CHAINS)[number];
export type EVMSmartWalletMainnet = (typeof PRODUCTION_AA_CHAINS)[number];
export type EVMSmartWalletChain = EVMSmartWalletTestnet | EVMSmartWalletMainnet;

export function toViemChain(chain: EVMSmartWalletChain): ViemChain {
    switch (chain) {
        case Blockchain.BASE_SEPOLIA:
            return baseSepolia;
        case Blockchain.BASE:
            return base;
        case Blockchain.POLYGON_AMOY:
            return polygonAmoy;
        case Blockchain.POLYGON:
            return polygon;
        case Blockchain.OPTIMISM_SEPOLIA:
            return optimismSepolia;
        case Blockchain.OPTIMISM:
            return optimism;
        case Blockchain.ARBITRUM_SEPOLIA:
            return arbitrumSepolia;
        case Blockchain.ARBITRUM:
            return arbitrum;
        case Blockchain.ARBITRUMNOVA:
            return arbitrumNova;
        case Blockchain.STORY_TESTNET:
            return storyTestnet;
        case Blockchain.STORY:
            return story;
        case Blockchain.MODE_SEPOLIA:
            return modeTestnet;
        case Blockchain.MODE:
            return mode;
        case Blockchain.BSC:
            return bsc;
        case Blockchain.SHAPE:
            return shape;
        case Blockchain.ZORA:
            return zora;
        case Blockchain.ZORA_SEPOLIA:
            return zoraSepolia;
        case Blockchain.ETHEREUM_SEPOLIA:
            return sepolia;
        case Blockchain.FLOW:
            return flowMainnet;
        case Blockchain.FLOW_TESTNET:
            return flowTestnet;
        case Blockchain.PLUME_TESTNET:
            return plumeTestnet;
        case Blockchain.PLUME:
            return plume;
        case Blockchain.ARC_TESTNET:
            return arcTestnet;
        case Blockchain.TEMPO_TESTNET:
            return tempoTestnet;
        case Blockchain.ABSTRACT:
        case Blockchain.ABSTRACT_TESTNET:
        case Blockchain.APECHAIN:
        case Blockchain.MANTLE:
        case Blockchain.MANTLE_SEPOLIA:
        case Blockchain.SCROLL:
        case Blockchain.SCROLL_SEPOLIA:
        case Blockchain.SEI_PACIFIC_1:
        case Blockchain.SEI_ATLANTIC_2_TESTNET:
        case Blockchain.CURTIS:
        case Blockchain.WORLDCHAIN:
        case Blockchain.WORLD_CHAIN_SEPOLIA:
            throw new Error(
                `Chain ${chain} is not yet supported in toViemChain function. Please add the appropriate viem chain definition.`
            );
        default:
            throw new Error(`Unknown chain: ${chain}`);
    }
}

export type SolanaChain = "solana";
export type StellarChain = "stellar";
export type EVMChain = EVMSmartWalletChain;

export type Chain = SolanaChain | EVMChain | StellarChain;

export function isTestnetChain(chain: EVMSmartWalletChain): chain is EVMSmartWalletTestnet {
    return (TESTNET_AA_CHAINS as readonly string[]).includes(chain);
}

export function isMainnetChain(chain: EVMSmartWalletChain): chain is EVMSmartWalletMainnet {
    return (PRODUCTION_AA_CHAINS as readonly string[]).includes(chain);
}
