import { EVMBlockchainIncludingTestnet } from "../../types/evm";

export const BLOCKCHAIN_TO_CHAIN_ID: Record<EVMBlockchainIncludingTestnet, number> = {
    ethereum: 1,
    "ethereum-sepolia": 11155111,
    polygon: 137,
    bsc: 56,
    optimism: 10,
    base: 8453,
    arbitrum: 42161,
    arbitrumnova: 42170,
    zora: 7777777,
    zkatana: 1261120,
    goerli: 5,
    mumbai: 80001,
};

export function blockchainToChainId(blockchain: EVMBlockchainIncludingTestnet) {
    return BLOCKCHAIN_TO_CHAIN_ID[blockchain];
}
