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
    ZD_ARBITRUM_PROJECT_ID,
    ZD_BSC_PROJECT_ID,
    ZD_ETHEREUM_PROJECT_ID,
    ZD_GOERLI_PROJECT_ID,
    ZD_MUMBAI_PROJECT_ID,
    ZD_OPTIMISM_PROJECT_ID,
    ZD_POLYGON_PROJECT_ID,
    ZD_SEPOLIA_PROJECT_ID,
    ZD_ZKATANA_PROJECT_ID,
    ZKATANA_CHAIN_ID,
} from "@/utils";
import { arbitrum, bsc, goerli, mainnet, optimism, polygon, polygonMumbai, sepolia } from "viem/chains";

import {
    BLOCKCHAIN_TEST_NET,
    BlockchainIncludingTestnet,
    EVMBlockchainIncludingTestnet,
    EVM_BLOCKCHAIN_INCLUDING_TESTNET,
} from "@crossmint/common-sdk-base";

/*
TODO:
Chains not supported yet due fireblocks or zerodev doesn't supported
    ARBITRUM_NOVA
    ZORA
    SOLANA
    CARDANO
*/

export function getFireblocksAssetId(chain: BlockchainIncludingTestnet) {
    const assetId = new Map([
        ["ethereum", "ETH"],
        ["polygon", "MATIC_POLYGON"],
        ["bsc", "BNB_BSC"],
        ["optimism", "ETH-OPT"],
        ["arbitrum", "ETH-AETH"],
        ["goerli", "ETH_TEST3"],
        ["ethereum-sepolia", "ETH_TEST5"],
        ["mumbai", "MATIC_POLYGON_MUMBAI"],
        ["zkatana", "ETH_ZKEVM_TEST"],
    ]).get(chain)!;

    if (assetId == null) {
        throw new Error(`Url not found for chain ${chain}`);
    }
    return assetId;
}
export function getBlockchainByChainId(chain: number) {
    const blockchain = new Map<number, BlockchainIncludingTestnet>([
        [ETHEREUM_CHAIN_ID, "ethereum"],
        [POLYGON_CHAIN_ID, "polygon"],
        [BSC_CHAIN_ID, "bsc"],
        [OPTIMISM_CHAIN_ID, "optimism"],
        [GOERLI_CHAIN_ID, "goerli"],
        [ARBITRUM_CHAIN_ID, "arbitrum"],
        [SEPOLIA_CHAIN_ID, "ethereum-sepolia"],
        [MUMBAI_CHAIN_ID, "mumbai"],
        [ZKATANA_CHAIN_ID, "zkatana"],
    ]).get(chain);

    if (blockchain == null) {
        throw new Error(`Url not found for chain ${chain}`);
    }
    return blockchain;
}

export function getChainIdByBlockchain(chain: BlockchainIncludingTestnet) {
    const chainId = new Map([
        ["ethereum", ETHEREUM_CHAIN_ID],
        ["polygon", POLYGON_CHAIN_ID],
        ["bsc", BSC_CHAIN_ID],
        ["optimism", OPTIMISM_CHAIN_ID],
        ["arbitrum", ARBITRUM_CHAIN_ID],
        ["goerli", GOERLI_CHAIN_ID],
        ["ethereum-sepolia", SEPOLIA_CHAIN_ID],
        ["mumbai", MUMBAI_CHAIN_ID],
        ["zkatana", ZKATANA_CHAIN_ID],
    ]).get(chain)!;

    if (chainId == null) {
        throw new Error(`Url not found for chain ${chain}`);
    }
    return chainId;
}

export function getUrlProviderByBlockchain(chain: BlockchainIncludingTestnet) {
    const url = new Map<BlockchainIncludingTestnet, string>([
        ["ethereum", "https://eth.llamarpc.com"],
        ["polygon", "https://polygon.llamarpc.com"],
        ["bsc", "https://binance.llamarpc.com"],
        ["optimism", "https://optimism.llamarpc.com"],
        ["arbitrum", "https://arbitrum.llamarpc.com"],
        ["goerli", "https://ethereum-goerli.publicnode.com"],
        ["ethereum-sepolia", "https://ethereum-sepolia.publicnode.com"],
        ["mumbai", "https://rpc-mumbai.maticvigil.com"],
        ["zkatana", "https://rpc.startale.com/zkatana"],
    ]).get(chain)!;

    if (url == null) {
        throw new Error(`Url not found for chain ${chain}`);
    }
    return url;
}

export function getBlockExplorerByBlockchain(chain: BlockchainIncludingTestnet) {
    const blockExplorer = new Map([
        ["ethereum", "https://etherscan.io"],
        ["polygon", "https://polygonscan.com"],
        ["bsc", "https://bscscan.com"],
        ["optimism", "https://optimistic.etherscan.io"],
        ["arbitrum", "https://arbiscan.io"],
        ["goerli", "https://goerli.etherscan.io"],
        ["ethereum-sepolia", "https://sepolia.etherscan.io"],
        ["mumbai", "https://mumbai.polygonscan.com"],
        ["zkatana", "https://zkatana.explorer.startale.com"],
    ]).get(chain)!;

    if (blockExplorer == null) {
        throw new Error(`Block Explorer not found for chain ${chain}`);
    }
    return blockExplorer;
}

export function getDisplayNameByBlockchain(chain: BlockchainIncludingTestnet) {
    const displayName = new Map([
        ["ethereum", "Ethereum Mainnet"],
        ["polygon", "Polygon Mainnet"],
        ["bsc", "BNB Smart Chain"],
        ["optimism", "Optimism"],
        ["arbitrum", "Arbitrum"],
        ["goerli", "Goerli Tesnet"],
        ["ethereum-sepolia", "Sepolia Tesnet"],
        ["mumbai", "Mumbai Tesnet"],
        ["zkatana", "zKatana Tesnet"],
    ]).get(chain)!;

    if (displayName == null) {
        throw new Error(`Display name not found for chain ${chain}`);
    }
    return displayName;
}

export function getTickerByBlockchain(chain: BlockchainIncludingTestnet) {
    const ticker = new Map([
        ["ethereum", "ETH"],
        ["polygon", "MATIC"],
        ["bsc", "BNB"],
        ["optimism", "OP"],
        ["arbitrum", "ARB"],
        ["goerli", "ETH"],
        ["ethereum-sepolia", "ETH"],
        ["mumbai", "MATIC"],
        ["zkatana", "ETH"],
    ]).get(chain)!;

    if (ticker == null) {
        throw new Error(`Ticker project id not found for chain ${chain}`);
    }
    return ticker;
}

export function getTickerNameByBlockchain(chain: BlockchainIncludingTestnet) {
    const tickerName = new Map([
        ["ethereum", "ETHEREUM"],
        ["polygon", "MATIC"],
        ["bsc", "BNB_BSC"],
        ["optimism", "OPTIMISM"],
        ["arbitrum", "ARBITRUM"],
        ["goerli", "ETHEREUM"],
        ["ethereum-sepolia", "ETHEREUM"],
        ["mumbai", "MATIC"],
        ["zkatana", "ETHEREUM"],
    ]).get(chain)!;

    if (tickerName == null) {
        throw new Error(`Ticker Name project id not found for chain ${chain}`);
    }
    return tickerName;
}

export function getZeroDevProjectIdByBlockchain(chain: BlockchainIncludingTestnet) {
    const zeroDevProjectId = new Map([
        ["ethereum", ZD_ETHEREUM_PROJECT_ID],
        ["polygon", ZD_POLYGON_PROJECT_ID],
        ["bsc", ZD_BSC_PROJECT_ID],
        ["optimism", ZD_OPTIMISM_PROJECT_ID],
        ["arbitrum", ZD_ARBITRUM_PROJECT_ID],
        ["goerli", ZD_GOERLI_PROJECT_ID],
        ["ethereum-sepolia", ZD_SEPOLIA_PROJECT_ID],
        ["mumbai", ZD_MUMBAI_PROJECT_ID],
        ["zkatana", ZD_ZKATANA_PROJECT_ID],
    ]).get(chain)!;

    if (zeroDevProjectId == null) {
        throw new Error(`ZeroDev project id not found for chain ${chain}`);
    }
    return zeroDevProjectId;
}

export function getViemNetwork(networkName: EVMBlockchainIncludingTestnet) {
    switch (networkName) {
        case "ethereum":
            return mainnet;
        case "polygon":
            return polygon;
        case "bsc":
            return bsc;
        case "optimism":
            return optimism;
        case "arbitrum":
            return arbitrum;
        case "goerli":
            return goerli;
        case "ethereum-sepolia":
            return sepolia;
        case "mumbai":
            return polygonMumbai;
        default:
            throw new Error(`Unsupported network: ${networkName}`);
    }
}
export function getApiUrlByBlockchainType(chain: BlockchainIncludingTestnet): string {
    const result = isTestnet(chain) ? CROSSMINT_STG_URL : CROSSMINT_PROD_URL;
    return result;
}

export function isTestnet(chain: BlockchainIncludingTestnet): boolean {
    return (BLOCKCHAIN_TEST_NET as readonly string[]).includes(chain);
}

export function isEVMBlockchain(chain: BlockchainIncludingTestnet): chain is EVMBlockchainIncludingTestnet {
    return (EVM_BLOCKCHAIN_INCLUDING_TESTNET as readonly string[]).includes(chain);
}
