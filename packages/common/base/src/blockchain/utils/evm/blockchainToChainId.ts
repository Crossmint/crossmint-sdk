import { EVMBlockchainIncludingTestnet } from "../../types/evm";

export const BLOCKCHAIN_TO_CHAIN_ID: Record<EVMBlockchainIncludingTestnet, number> = {
    ethereum: 1,
    polygon: 137,
    bsc: 56,
    optimism: 10,
    arbitrum: 42161,
    base: 8453,
    zora: 7777777,
    arbitrumnova: 42170,
    "ethereum-sepolia": 11155111,
    "ethereum-goerli": 5,
    "polygon-mumbai": 80001,
    "bsc-testnet": 97,
    "optimism-sepolia": 11155420,
    "optimism-goerli": 420,
    "base-goerli": 84531,
    "base-sepolia": 84532,
    "arbitrum-sepolia": 421614,
    "zora-sepolia": 999999999,
    "zora-goerli": 999,
    zkatana: 1261120,
    "astar-zkevm": 3776,
    apex: 70700,
    "hypersonic-testnet": 675852,
};

export function blockchainToChainId(blockchain: EVMBlockchainIncludingTestnet) {
    return BLOCKCHAIN_TO_CHAIN_ID[blockchain];
}
