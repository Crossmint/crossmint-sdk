import { BlockchainIncludingTestnet as Blockchain } from "@crossmint/common-sdk-base";

const SMART_WALLET_TESTNET_CHAINS = [
    Blockchain.BASE_SEPOLIA,
    Blockchain.POLYGON_AMOY,
    Blockchain.OPTIMISM_SEPOLIA,
    Blockchain.ARBITRUM_SEPOLIA,
];

const SMART_WALLET_MAINNET_CHAINS = [Blockchain.BASE, Blockchain.POLYGON, Blockchain.OPTIMISM, Blockchain.ARBITRUM];

type SmartWalletTestnet = (typeof SMART_WALLET_TESTNET_CHAINS)[number];
type SmartWalletMainnet = (typeof SMART_WALLET_MAINNET_CHAINS)[number];
export type SmartWalletChain = SmartWalletTestnet | SmartWalletMainnet;

export function isTestnetChain(chain: SmartWalletChain): chain is SmartWalletTestnet {
    return (SMART_WALLET_TESTNET_CHAINS as SmartWalletChain[]).includes(chain);
}

export function isMainnetChain(chain: SmartWalletChain): chain is SmartWalletMainnet {
    return (SMART_WALLET_MAINNET_CHAINS as SmartWalletChain[]).includes(chain);
}
