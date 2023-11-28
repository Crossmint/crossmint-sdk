export const EVMBlockchain = {
    ETHEREUM: "ethereum",
    POLYGON: "polygon",
    BSC: "bsc",
    OPTIMISM: "optimism",
    ARBITRUM: "arbitrum",
    ARBITRUM_NOVA: "arbitrumnova",
    ZORA: "zora",
} as const;
export type EVMBlockchain = (typeof EVMBlockchain)[keyof typeof EVMBlockchain];

export const NonEVMBlockchain = {
    SOLANA: "solana",
    CARDANO: "cardano",
} as const;
export type NonEVMBlockchain = (typeof NonEVMBlockchain)[keyof typeof NonEVMBlockchain];

export const BlockchainTestNet = {
    GOERLI: "goerli",
    SEPOLIA: "sepolia",
    MUMBAI: "mumbai",
    TESTNET: "testnet",
} as const; //testnet as a placeholder for non-EVM chains
export type BlockchainTestNet = (typeof BlockchainTestNet)[keyof typeof BlockchainTestNet];

export const Blockchain = {
    ...EVMBlockchain,
    ...NonEVMBlockchain,
    ...BlockchainTestNet,
} as const;
export type Blockchain = (typeof Blockchain)[keyof typeof Blockchain];

export function getAssetIdByBlockchain(chain: Blockchain) {
    return new Map([
        [Blockchain.ETHEREUM, "ETH"],
        [Blockchain.POLYGON, "MATIC"],
        [Blockchain.BSC, "BNB_BSC"],
        [Blockchain.OPTIMISM, "ETH-OPT"],
        [Blockchain.ARBITRUM, "ETH-AETH"],
        [Blockchain.ARBITRUM_NOVA, ""], // TODO
        [Blockchain.ZORA, "ETH"],
        [Blockchain.SOLANA, ""], // TODO
        [Blockchain.CARDANO, ""], // TODO
        [Blockchain.GOERLI, "ETH_TEST3"],
        [Blockchain.SEPOLIA, ""], // TODO
        [Blockchain.MUMBAI, "MATIC_POLYGON_MUMBAI"],
        [Blockchain.TESTNET, ""], // TODO
    ]).get(chain)!;
}

export function getBlockchainByChainId(chain: number) {
    const chainIdMap = new Map<number, Blockchain>([
        [1, Blockchain.ETHEREUM],
        [137, Blockchain.POLYGON],
        [56, Blockchain.BSC],
        //[0, Blockchain.OPTIMISM], // TODO
        [42161, Blockchain.ARBITRUM],
        [42170, Blockchain.ARBITRUM_NOVA],
        [7777777, Blockchain.ZORA],
        //[0, Blockchain.SOLANA], // TODO
        //[0, Blockchain.CARDANO], // TODO
        [5, Blockchain.GOERLI],
        //[0, Blockchain.SEPOLIA], // TODO
        [80001, Blockchain.MUMBAI],
        [0, Blockchain.TESTNET], // TODO
    ]);

    return chainIdMap.get(chain);
}

export function getUrlProviderByBlockchain(chain: Blockchain) {
    return new Map([
        [Blockchain.ETHEREUM, "https://eth.llamarpc.com"],
        [Blockchain.POLYGON, "https://polygon.llamarpc.com"],
        [Blockchain.BSC, "BNB_BSC"],
        [Blockchain.OPTIMISM, "https://optimism.llamarpc.com"],
        [Blockchain.ARBITRUM, "https://arbitrum.llamarpc.com"],
        [Blockchain.ARBITRUM_NOVA, ""],
        [Blockchain.ZORA, "https://rpc.zora.energy"],
        [Blockchain.SOLANA, ""],
        [Blockchain.CARDANO, ""],
        [Blockchain.GOERLI, "https://ethereum-goerli.publicnode.com"],
        [Blockchain.SEPOLIA, "https://ethereum-sepolia.publicnode.com"],
        [Blockchain.MUMBAI, "https://rpc-mumbai.maticvigil.com"],
        [Blockchain.TESTNET, ""],
    ]).get(chain)!;
}
