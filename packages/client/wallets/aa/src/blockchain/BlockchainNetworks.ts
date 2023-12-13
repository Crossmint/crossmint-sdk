import { CROSSMINT_PROD_URL, CROSSMINT_STG_URL, WEB3_AUTH_MAINNET, WEB3_AUTH_TESTNET } from "@/utils";
import { TORUS_LEGACY_NETWORK_TYPE } from "@web3auth/single-factor-auth";

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
} as const; //testnet as a placeholder for non-EVM chains
export type BlockchainTestNet = (typeof BlockchainTestNet)[keyof typeof BlockchainTestNet];

export const EVMBlockchainWithTestnet = {
    ...EVMBlockchain,
    ...BlockchainTestNet,
} as const;

export type EVMBlockchainWithTestnet = (typeof EVMBlockchainWithTestnet)[keyof typeof EVMBlockchainWithTestnet];

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
    ]);

    return chainIdMap.get(chain);
}

export function getChainIdByBlockchain(chain: Blockchain) {
    return new Map([
        [Blockchain.ETHEREUM, 1],
        [Blockchain.POLYGON, 137],
        [Blockchain.BSC, 56],
        [Blockchain.OPTIMISM, 0], // TODO
        [Blockchain.ARBITRUM, 42161],
        [Blockchain.ARBITRUM_NOVA, 42170],
        [Blockchain.ZORA, 7777777],
        [Blockchain.SOLANA, 0], // TODO
        [Blockchain.CARDANO, 0], // TODO
        [Blockchain.GOERLI, 5],
        [Blockchain.SEPOLIA, 0], // TODO
        [Blockchain.MUMBAI, 80001],
    ]).get(chain)!;
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
    ]).get(chain)!;
}

export function getBlockExplorerByBlockchain(chain: Blockchain) {
    return new Map([
        [Blockchain.ETHEREUM, "https://etherscan.io"],
        [Blockchain.POLYGON, "https://polygonscan.com"],
        [Blockchain.BSC, "BNB_BSC"],
        [Blockchain.OPTIMISM, "https://optimistic.etherscan.io"],
        [Blockchain.ARBITRUM, "https://arbiscan.io"],
        [Blockchain.ARBITRUM_NOVA, ""],
        [Blockchain.ZORA, "https://explorer.zora.energy"],
        [Blockchain.SOLANA, ""],
        [Blockchain.CARDANO, ""],
        [Blockchain.GOERLI, "https://goerli.etherscan.io"],
        [Blockchain.SEPOLIA, "https://sepolia.etherscan.io"],
        [Blockchain.MUMBAI, "https://mumbai.polygonscan.com"],
    ]).get(chain)!;
}

export function getDisplayNameByBlockchain(chain: Blockchain) {
    return new Map([
        [Blockchain.ETHEREUM, "Ethereum Mainnet"],
        [Blockchain.POLYGON, "Polygon Mainnet"],
        [Blockchain.BSC, "BNB_BSC"],
        [Blockchain.OPTIMISM, "Optimism"],
        [Blockchain.ARBITRUM, "Arbitrum"],
        [Blockchain.ARBITRUM_NOVA, ""],
        [Blockchain.ZORA, "Zora"],
        [Blockchain.SOLANA, ""],
        [Blockchain.CARDANO, ""],
        [Blockchain.GOERLI, "Goerli Tesnet"],
        [Blockchain.SEPOLIA, "Sepolia Tesnet"],
        [Blockchain.MUMBAI, "Mumbai Tesnet"],
    ]).get(chain)!;
}

export function getTickerByBlockchain(chain: Blockchain) {
    return new Map([
        [Blockchain.ETHEREUM, "ETH"],
        [Blockchain.POLYGON, "MATIC"],
        [Blockchain.BSC, "BNB_BSC"],
        [Blockchain.OPTIMISM, "OP"],
        [Blockchain.ARBITRUM, "ARB"],
        [Blockchain.ARBITRUM_NOVA, ""],
        [Blockchain.ZORA, "ZORA"],
        [Blockchain.SOLANA, ""],
        [Blockchain.CARDANO, ""],
        [Blockchain.GOERLI, "ETH"],
        [Blockchain.SEPOLIA, "ETH"],
        [Blockchain.MUMBAI, "MATIC"],
    ]).get(chain)!;
}

export function getTickerNameByBlockchain(chain: Blockchain) {
    return new Map([
        [Blockchain.ETHEREUM, "ETHEREUM"],
        [Blockchain.POLYGON, "MATIC"],
        [Blockchain.BSC, "BNB_BSC"],
        [Blockchain.OPTIMISM, "OPTIMISM"],
        [Blockchain.ARBITRUM, "ARBITRUM"],
        [Blockchain.ARBITRUM_NOVA, ""],
        [Blockchain.ZORA, "ZORA"],
        [Blockchain.SOLANA, ""],
        [Blockchain.CARDANO, ""],
        [Blockchain.GOERLI, "ETHEREUM"],
        [Blockchain.SEPOLIA, "ETHEREUM"],
        [Blockchain.MUMBAI, "MATIC"],
    ]).get(chain)!;
}

export function getApiUrlByBlockchainType(chain: Blockchain): string {
    const result = isTestnet(chain) ? CROSSMINT_STG_URL : CROSSMINT_PROD_URL;
    return result;
}

export function getWeb3AuthBlockchain(chain: Blockchain): TORUS_LEGACY_NETWORK_TYPE {
    return isTestnet(chain) ? WEB3_AUTH_TESTNET : WEB3_AUTH_MAINNET;
}

export function isTestnet(chain: Blockchain): boolean {
    const testnetKeys = new Set<keyof typeof BlockchainTestNet>(
        Object.keys(BlockchainTestNet) as Array<keyof typeof BlockchainTestNet>
    );

    if (testnetKeys.has(chain.toUpperCase() as keyof typeof BlockchainTestNet)) {
        return true;
    } else {
        return false;
    }
}
