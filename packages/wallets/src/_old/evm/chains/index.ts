import { BlockchainIncludingTestnet as Blockchain } from "@crossmint/common-sdk-base";
import type { Chain } from "viem";
import {
    baseSepolia,
    base,
    polygonAmoy,
    polygon,
    optimismSepolia,
    optimism,
    arbitrumSepolia,
    arbitrum,
    modeTestnet,
    mode,
    bsc,
    shape,
} from "viem/chains";

import { story } from "../../../chains/definitions/story";
import { storyTestnet } from "../../../chains/definitions/storyTestnet";

const EVM_SMART_WALLET_TESTNET_CHAINS = [
    Blockchain.BASE_SEPOLIA,
    Blockchain.POLYGON_AMOY,
    Blockchain.OPTIMISM_SEPOLIA,
    Blockchain.ARBITRUM_SEPOLIA,
    Blockchain.STORY_TESTNET,
    Blockchain.MODE_SEPOLIA,
] as const;

const EVM_SMART_WALLET_MAINNET_CHAINS = [
    Blockchain.BASE,
    Blockchain.POLYGON,
    Blockchain.OPTIMISM,
    Blockchain.ARBITRUM,
    Blockchain.STORY,
    Blockchain.MODE,
    Blockchain.BSC,
    Blockchain.SHAPE,
] as const;

export type EVMSmartWalletTestnet = (typeof EVM_SMART_WALLET_TESTNET_CHAINS)[number];
export type EVMSmartWalletMainnet = (typeof EVM_SMART_WALLET_MAINNET_CHAINS)[number];
export type EVMSmartWalletChain = EVMSmartWalletTestnet | EVMSmartWalletMainnet;

export function isTestnetChain(chain: EVMSmartWalletChain): chain is EVMSmartWalletTestnet {
    return (EVM_SMART_WALLET_TESTNET_CHAINS as readonly EVMSmartWalletTestnet[]).includes(
        chain as EVMSmartWalletTestnet
    );
}

export function isMainnetChain(chain: EVMSmartWalletChain): chain is EVMSmartWalletMainnet {
    return (EVM_SMART_WALLET_MAINNET_CHAINS as readonly EVMSmartWalletMainnet[]).includes(
        chain as EVMSmartWalletMainnet
    );
}

export function isValidChain(chain: string): chain is EVMSmartWalletChain {
    return isTestnetChain(chain as EVMSmartWalletTestnet) || isMainnetChain(chain as EVMSmartWalletMainnet);
}

export function toViemChain(chain: EVMSmartWalletChain): Chain {
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
    }
}
