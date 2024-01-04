import {
    ARBITRUM_CHAIN_ID,
    BSC_CHAIN_ID,
    CROSSMINT_PROD_URL,
    CROSSMINT_STG_URL,
    ETHEREUM_CHAIN_ID,
    GOERLI_CHAIN_ID,
    MUMBAI_CHAIN_ID,
    OPTIMISM_CHAIN_ID,
    POLYGON_CHAIN_ID,
    SEPOLIA_CHAIN_ID,
    ZKATANA_CHAIN_ID,
    WEB3_AUTH_MAINNET,
    WEB3_AUTH_TESTNET,
    ZD_ARBITRUM_PROJECT_ID,
    ZD_BSC_PROJECT_ID,
    ZD_ETHEREUM_PROJECT_ID,
    ZD_GOERLI_PROJECT_ID,
    ZD_MUMBAI_PROJECT_ID,
    ZD_OPTIMISM_PROJECT_ID,
    ZD_POLYGON_PROJECT_ID,
    ZD_SEPOLIA_PROJECT_ID,
    ZD_ZKATANA_PROJECT_ID,
} from "@/utils";
import { TORUS_LEGACY_NETWORK_TYPE } from "@web3auth/single-factor-auth";

/*
TODO:
Chains not supported yet due fireblocks or zerodev doesn't supported
    ARBITRUM_NOVA
    ZORA
    SOLANA
    CARDANO
*/
export const EVMBlockchain = {
    ETHEREUM: "ethereum",
    POLYGON: "polygon",
    BSC: "bsc",
    OPTIMISM: "optimism",
    ARBITRUM: "arbitrum",
} as const;
export type EVMBlockchain = (typeof EVMBlockchain)[keyof typeof EVMBlockchain];

export const BlockchainTestNet = {
    GOERLI: "goerli",
    SEPOLIA: "sepolia",
    MUMBAI: "mumbai",
    ZKATANA: "zkatana",
} as const;
export type BlockchainTestNet = (typeof BlockchainTestNet)[keyof typeof BlockchainTestNet];

export const EVMBlockchainWithTestnet = {
    ...EVMBlockchain,
    ...BlockchainTestNet,
} as const;

export type EVMBlockchainWithTestnet = (typeof EVMBlockchainWithTestnet)[keyof typeof EVMBlockchainWithTestnet];

export const Blockchain = {
    ...EVMBlockchain,
    ...BlockchainTestNet,
} as const;
export type Blockchain = (typeof Blockchain)[keyof typeof Blockchain];

export function getAssetIdByBlockchain(chain: Blockchain) {
    return new Map([
        [Blockchain.ETHEREUM, "ETH"],
        [Blockchain.POLYGON, "MATIC_POLYGON"],
        [Blockchain.BSC, "BNB_BSC"],
        [Blockchain.OPTIMISM, "ETH-OPT"],
        [Blockchain.ARBITRUM, "ETH-AETH"],
        [Blockchain.GOERLI, "ETH_TEST3"],
        [Blockchain.SEPOLIA, "ETH_TEST5"],
        [Blockchain.MUMBAI, "MATIC_POLYGON_MUMBAI"],
        [Blockchain.ZKATANA, "ETH_ZKEVM_TEST"],
    ]).get(chain)!;
}

export function getBlockchainByChainId(chain: number) {
    const chainIdMap = new Map<number, Blockchain>([
        [ETHEREUM_CHAIN_ID, Blockchain.ETHEREUM],
        [POLYGON_CHAIN_ID, Blockchain.POLYGON],
        [BSC_CHAIN_ID, Blockchain.BSC],
        [OPTIMISM_CHAIN_ID, Blockchain.OPTIMISM],
        [ARBITRUM_CHAIN_ID, Blockchain.ARBITRUM],
        [GOERLI_CHAIN_ID, Blockchain.GOERLI],
        [SEPOLIA_CHAIN_ID, Blockchain.SEPOLIA],
        [MUMBAI_CHAIN_ID, Blockchain.MUMBAI],
        [ZKATANA_CHAIN_ID, Blockchain.ZKATANA],
    ]);

    return chainIdMap.get(chain);
}

export function getChainIdByBlockchain(chain: Blockchain) {
    return new Map([
        [Blockchain.ETHEREUM, ETHEREUM_CHAIN_ID],
        [Blockchain.POLYGON, POLYGON_CHAIN_ID],
        [Blockchain.BSC, BSC_CHAIN_ID],
        [Blockchain.OPTIMISM, OPTIMISM_CHAIN_ID],
        [Blockchain.ARBITRUM, ARBITRUM_CHAIN_ID],
        [Blockchain.GOERLI, GOERLI_CHAIN_ID],
        [Blockchain.SEPOLIA, SEPOLIA_CHAIN_ID],
        [Blockchain.MUMBAI, MUMBAI_CHAIN_ID],
        [Blockchain.ZKATANA, ZKATANA_CHAIN_ID],
    ]).get(chain)!;
}

export function getUrlProviderByBlockchain(chain: Blockchain) {
    return new Map([
        [Blockchain.ETHEREUM, "https://eth.llamarpc.com"],
        [Blockchain.POLYGON, "https://polygon.llamarpc.com"],
        [Blockchain.BSC, "BNB_BSC"],
        [Blockchain.OPTIMISM, "https://optimism.llamarpc.com"],
        [Blockchain.ARBITRUM, "https://arbitrum.llamarpc.com"],
        [Blockchain.GOERLI, "https://ethereum-goerli.publicnode.com"],
        [Blockchain.SEPOLIA, "https://ethereum-sepolia.publicnode.com"],
        [Blockchain.MUMBAI, "https://rpc-mumbai.maticvigil.com"],
        [Blockchain.ZKATANA, "https://rpc.startale.com/zkatana"],
    ]).get(chain)!;
}

export function getBlockExplorerByBlockchain(chain: Blockchain) {
    return new Map([
        [Blockchain.ETHEREUM, "https://etherscan.io"],
        [Blockchain.POLYGON, "https://polygonscan.com"],
        [Blockchain.BSC, "BNB_BSC"],
        [Blockchain.OPTIMISM, "https://optimistic.etherscan.io"],
        [Blockchain.ARBITRUM, "https://arbiscan.io"],
        [Blockchain.GOERLI, "https://goerli.etherscan.io"],
        [Blockchain.SEPOLIA, "https://sepolia.etherscan.io"],
        [Blockchain.MUMBAI, "https://mumbai.polygonscan.com"],
        [Blockchain.ZKATANA, "https://zkatana.explorer.startale.com"],
    ]).get(chain)!;
}

export function getDisplayNameByBlockchain(chain: Blockchain) {
    return new Map([
        [Blockchain.ETHEREUM, "Ethereum Mainnet"],
        [Blockchain.POLYGON, "Polygon Mainnet"],
        [Blockchain.BSC, "BNB_BSC"],
        [Blockchain.OPTIMISM, "Optimism"],
        [Blockchain.ARBITRUM, "Arbitrum"],
        [Blockchain.GOERLI, "Goerli Tesnet"],
        [Blockchain.SEPOLIA, "Sepolia Tesnet"],
        [Blockchain.MUMBAI, "Mumbai Tesnet"],
        [Blockchain.ZKATANA, "zKatana Tesnet"],
    ]).get(chain)!;
}

export function getTickerByBlockchain(chain: Blockchain) {
    return new Map([
        [Blockchain.ETHEREUM, "ETH"],
        [Blockchain.POLYGON, "MATIC"],
        [Blockchain.BSC, "BNB_BSC"],
        [Blockchain.OPTIMISM, "OP"],
        [Blockchain.ARBITRUM, "ARB"],
        [Blockchain.GOERLI, "ETH"],
        [Blockchain.SEPOLIA, "ETH"],
        [Blockchain.MUMBAI, "MATIC"],
        [Blockchain.ZKATANA, "ETH"],
    ]).get(chain)!;
}

export function getTickerNameByBlockchain(chain: Blockchain) {
    return new Map([
        [Blockchain.ETHEREUM, "ETHEREUM"],
        [Blockchain.POLYGON, "MATIC"],
        [Blockchain.BSC, "BNB_BSC"],
        [Blockchain.OPTIMISM, "OPTIMISM"],
        [Blockchain.ARBITRUM, "ARBITRUM"],
        [Blockchain.GOERLI, "ETHEREUM"],
        [Blockchain.SEPOLIA, "ETHEREUM"],
        [Blockchain.MUMBAI, "MATIC"],
        [Blockchain.ZKATANA, "ETHEREUM"],
    ]).get(chain)!;
}

export function getZeroDevProjectIdByBlockchain(chain: Blockchain) {
    const zeroDevProjectId = new Map<Blockchain, string>([
        [Blockchain.ETHEREUM, ZD_ETHEREUM_PROJECT_ID],
        [Blockchain.POLYGON, ZD_POLYGON_PROJECT_ID],
        [Blockchain.BSC, ZD_BSC_PROJECT_ID],
        [Blockchain.OPTIMISM, ZD_OPTIMISM_PROJECT_ID],
        [Blockchain.ARBITRUM, ZD_ARBITRUM_PROJECT_ID],
        [Blockchain.GOERLI, ZD_GOERLI_PROJECT_ID],
        [Blockchain.SEPOLIA, ZD_SEPOLIA_PROJECT_ID],
        [Blockchain.MUMBAI, ZD_MUMBAI_PROJECT_ID],
        [Blockchain.ZKATANA, ZD_ZKATANA_PROJECT_ID],
    ]).get(chain);
    if (zeroDevProjectId == null) {
        throw new Error(`ZeroDev project id not found for chain ${chain}`);
    }
    return zeroDevProjectId;
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

export function isEVMBlockchain(chain: Blockchain): chain is EVMBlockchain {
    const evmKeys = new Set<keyof typeof EVMBlockchainWithTestnet>(
        Object.keys(EVMBlockchainWithTestnet) as Array<keyof typeof EVMBlockchainWithTestnet>
    );

    if (evmKeys.has(chain.toUpperCase() as keyof typeof EVMBlockchainWithTestnet)) {
        return true;
    } else {
        return false;
    }
}
