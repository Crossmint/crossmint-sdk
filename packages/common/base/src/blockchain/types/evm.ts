import { ObjectValues, objectValues } from "@/types";

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
} as const;
export type EVMBlockchain = ObjectValues<typeof EVMBlockchain>;
export const EVM_CHAINS = objectValues(EVMBlockchain);

export const EVMBlockchainTestnet = {
    GOERLI: "goerli",
    ETHEREUM_SEPOLIA: "ethereum-sepolia",
    MUMBAI: "mumbai",
    ZKATANA: "zkatana",
} as const;
export type EVMBlockchainTestnet = ObjectValues<typeof EVMBlockchainTestnet>;
export const EVM_BLOCKCHAIN_TESTNETS = objectValues(EVMBlockchainTestnet);

export const EVMBlockchainIncludingTestnet = {
    ...EVMBlockchain,
    ...EVMBlockchainTestnet,
} as const;
export type EVMBlockchainIncludingTestnet = ObjectValues<typeof EVMBlockchainIncludingTestnet>;
export const EVM_BLOCKCHAINS_INCLUDING_TESTNETS = objectValues(EVMBlockchainIncludingTestnet);
