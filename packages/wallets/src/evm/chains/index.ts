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
} from "viem/chains";

import { story } from "./definitions/story";
import { storyTestnet } from "./definitions/storyTestnet";

const EVM_SMART_WALLET_TESTNET_CHAINS = [
    Blockchain.BASE_SEPOLIA,
    Blockchain.POLYGON_AMOY,
    Blockchain.OPTIMISM_SEPOLIA,
    Blockchain.ARBITRUM_SEPOLIA,
    Blockchain.STORY_TESTNET,
    Blockchain.MODE_SEPOLIA,
];

const EVM_SMART_WALLET_MAINNET_CHAINS = [
    Blockchain.BASE,
    Blockchain.POLYGON,
    Blockchain.OPTIMISM,
    Blockchain.ARBITRUM,
    Blockchain.STORY,
    Blockchain.MODE,
    Blockchain.BSC,
];

type EVMSmartWalletTestnet = (typeof EVM_SMART_WALLET_TESTNET_CHAINS)[number];
type EVMSmartWalletMainnet = (typeof EVM_SMART_WALLET_MAINNET_CHAINS)[number];
export type EVMSmartWalletChain = EVMSmartWalletTestnet | EVMSmartWalletMainnet;

export function isTestnetChain(chain: EVMSmartWalletChain): chain is EVMSmartWalletTestnet {
    return (EVM_SMART_WALLET_TESTNET_CHAINS as EVMSmartWalletChain[]).includes(chain);
}

export function isMainnetChain(chain: EVMSmartWalletChain): chain is EVMSmartWalletMainnet {
    return (EVM_SMART_WALLET_MAINNET_CHAINS as EVMSmartWalletChain[]).includes(chain);
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
    }
}
