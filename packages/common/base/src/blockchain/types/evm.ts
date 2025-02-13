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
    APEX: "apex",
    CHILIZ: "chiliz",
    STORY: "story",
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
} as const;
export type EVMBlockchainTestnet = ObjectValues<typeof EVMBlockchainTestnet>;
export const EVM_BLOCKCHAIN_TESTNETS = objectValues(EVMBlockchainTestnet);

export const EVMBlockchainIncludingTestnet = {
    ...EVMBlockchain,
    ...EVMBlockchainTestnet,
} as const;
export type EVMBlockchainIncludingTestnet = ObjectValues<typeof EVMBlockchainIncludingTestnet>;
export const EVM_BLOCKCHAINS_INCLUDING_TESTNETS = objectValues(EVMBlockchainIncludingTestnet);
