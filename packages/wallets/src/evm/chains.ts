import { BlockchainIncludingTestnet as Blockchain } from "@crossmint/common-sdk-base";

const EVM_SMART_WALLET_TESTNET_CHAINS = [
    Blockchain.BASE_SEPOLIA,
    Blockchain.POLYGON_AMOY,
    Blockchain.OPTIMISM_SEPOLIA,
    Blockchain.ARBITRUM_SEPOLIA,
    Blockchain.STORY_TESTNET,
];

const EVM_SMART_WALLET_MAINNET_CHAINS = [
    Blockchain.BASE,
    Blockchain.POLYGON,
    Blockchain.OPTIMISM,
    Blockchain.ARBITRUM,
    Blockchain.STORY,
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
