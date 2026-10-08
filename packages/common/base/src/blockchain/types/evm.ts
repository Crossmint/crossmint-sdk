import { type ObjectValues, objectValues } from "@/types";

export const EVMBlockchain = {
    ETHEREUM: "ethereum",
    POLYGON: "polygon",
    BSC: "bsc",
    OPTIMISM: "optimism",
    ARBITRUM: "arbitrum",
    BASE: "base",
    ZORA: "zora",
    ARBITRUMNOVA: "arbitrumnova",
    CHILIZ: "chiliz",
    STORY: "story",
    SHAPE: "shape",
    ABSTRACT: "abstract",
    APECHAIN: "apechain",
    MANTLE: "mantle",
    SCROLL: "scroll",
    SEI_PACIFIC_1: "sei-pacific-1",
    FLOW: "flow",
    TEMPO: "tempo",
    AVALANCHE: "avalanche",
    CELO: "celo",
    ROBINHOOD_CHAIN: "robinhood-chain",
    ARC: "arc",
} as const;
export type EVMBlockchain = ObjectValues<typeof EVMBlockchain>;
export const EVM_CHAINS = objectValues(EVMBlockchain);

export const EVMBlockchainTestnet = {
    ARBITRUM_SEPOLIA: "arbitrum-sepolia",
    BASE_SEPOLIA: "base-sepolia",
    BSC_TESTNET: "bsc-testnet",
    ETHEREUM_SEPOLIA: "ethereum-sepolia",
    POLYGON_AMOY: "polygon-amoy",
    OPTIMISM_SEPOLIA: "optimism-sepolia",
    ZORA_SEPOLIA: "zora-sepolia",
    HYPERSONIC_TESTNET: "hypersonic-testnet",
    STORY_TESTNET: "story-testnet",
    ABSTRACT_TESTNET: "abstract-testnet",
    CURTIS: "curtis",
    MANTLE_SEPOLIA: "mantle-sepolia",
    SCROLL_SEPOLIA: "scroll-sepolia",
    SEI_ATLANTIC_2_TESTNET: "sei-atlantic-2-testnet",
    FLOW_TESTNET: "flow-testnet",
    ARC_TESTNET: "arc-testnet",
    TEMPO_TESTNET: "tempo-testnet",
    AVALANCHE_FUJI: "avalanche-fuji",
    CELO_SEPOLIA: "celo-sepolia",
    ROBINHOOD_CHAIN_TESTNET: "robinhood-chain-testnet",
} as const;
export type EVMBlockchainTestnet = ObjectValues<typeof EVMBlockchainTestnet>;
export const EVM_BLOCKCHAIN_TESTNETS = objectValues(EVMBlockchainTestnet);

export const EVMBlockchainIncludingTestnet = {
    ...EVMBlockchain,
    ...EVMBlockchainTestnet,
} as const;
export type EVMBlockchainIncludingTestnet = ObjectValues<typeof EVMBlockchainIncludingTestnet>;
export const EVM_BLOCKCHAINS_INCLUDING_TESTNETS = objectValues(EVMBlockchainIncludingTestnet);
