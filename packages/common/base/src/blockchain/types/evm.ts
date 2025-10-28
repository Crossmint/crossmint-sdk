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
    ZKATANA: "zkatana",
    ZKYOTO: "zkyoto",
    ASTAR_ZKEVM: "astar-zkevm",
    CHILIZ: "chiliz",
    STORY: "story",
    MODE: "mode",
    SHAPE: "shape",
    WORLDCHAIN: "world-chain",
    ABSTRACT: "abstract",
    APECHAIN: "apechain",
    MANTLE: "mantle",
    SCROLL: "scroll",
    SEI_PACIFIC_1: "sei-pacific-1",
    FLOW: "flow",
    PLUME: "plume",
} as const;
export type EVMBlockchain = ObjectValues<typeof EVMBlockchain>;
export const EVM_CHAINS = objectValues(EVMBlockchain);

export const EVMBlockchainTestnet = {
    ARBITRUM_SEPOLIA: "arbitrum-sepolia",
    BASE_GOERLI: "base-goerli",
    BASE_SEPOLIA: "base-sepolia",
    BSC_TESTNET: "bsc-testnet",
    ETHEREUM_GOERLI: "ethereum-goerli",
    ETHEREUM_SEPOLIA: "ethereum-sepolia",
    POLYGON_MUMBAI: "polygon-mumbai",
    POLYGON_AMOY: "polygon-amoy",
    OPTIMISM_GOERLI: "optimism-goerli",
    OPTIMISM_SEPOLIA: "optimism-sepolia",
    ZORA_GOERLI: "zora-goerli",
    ZORA_SEPOLIA: "zora-sepolia",
    HYPERSONIC_TESTNET: "hypersonic-testnet",
    STORY_TESTNET: "story-testnet",
    MODE_SEPOLIA: "mode-sepolia",
    ABSTRACT_TESTNET: "abstract-testnet",
    CURTIS: "curtis",
    MANTLE_SEPOLIA: "mantle-sepolia",
    SCROLL_SEPOLIA: "scroll-sepolia",
    SEI_ATLANTIC_2_TESTNET: "sei-atlantic-2-testnet",
    WORLD_CHAIN_SEPOLIA: "world-chain-sepolia",
    FLOW_TESTNET: "flow-testnet",
    PLUME_TESTNET: "plume-testnet",
} as const;
export type EVMBlockchainTestnet = ObjectValues<typeof EVMBlockchainTestnet>;
export const EVM_BLOCKCHAIN_TESTNETS = objectValues(EVMBlockchainTestnet);

export const EVMBlockchainIncludingTestnet = {
    ...EVMBlockchain,
    ...EVMBlockchainTestnet,
} as const;
export type EVMBlockchainIncludingTestnet = ObjectValues<typeof EVMBlockchainIncludingTestnet>;
export const EVM_BLOCKCHAINS_INCLUDING_TESTNETS = objectValues(EVMBlockchainIncludingTestnet);
