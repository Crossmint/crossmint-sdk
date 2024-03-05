import {
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
import { arbitrum, bsc, goerli, mainnet, optimism, polygon, polygonMumbai, sepolia } from "viem/chains";

import { EVMBlockchainIncludingTestnet } from "@crossmint/common-sdk-base";

/*
TODO:
Chains not supported yet due fireblocks or zerodev doesn't supported
    ARBITRUM_NOVA
    ZORA
    SOLANA
    CARDANO
*/

export function getFireblocksAssetId(chain: EVMBlockchainIncludingTestnet) {
    const assetId = new Map<EVMBlockchainIncludingTestnet, string | null>([
        ["ethereum", "ETH"],
        ["ethereum-goerli", "ETH_TEST3"],
        ["ethereum-sepolia", "ETH_TEST5"],
        ["polygon", "MATIC_POLYGON"],
        ["polygon-mumbai", "MATIC_POLYGON_MUMBAI"],
        ["bsc", "BNB_BSC"],
        ["optimism", "ETH-OPT"],
        ["optimism-sepolia", "ETH-OPT_KOV"],
        ["optimism-goerli", "ETH-OPT_KOV"],
        ["arbitrum", "ETH-AETH"],
        ["arbitrum-sepolia", "ETH-AETH_RIN"],
        ["base-sepolia", "ETH_TEST3"],
        ["base-goerli", "ETH_TEST3"],
        ["zora", "ETH"],
        ["zora-sepolia", "ETH_TEST3"],
        ["zora-goerli", "ETH_TEST3"],
        ["zkatana", "ETH_ZKEVM_TEST"],
        ["bsc-testnet", null],
        ["base", null],
    ]).get(chain)!;

    if (assetId == null) {
        throw new Error(`Asset not found for chain ${chain}`);
    }
    return assetId;
}

export function getUrlProviderByBlockchain(chain: EVMBlockchainIncludingTestnet) {
    const url = new Map<EVMBlockchainIncludingTestnet, string | null>([
        ["ethereum", "https://eth.llamarpc.com"],
        ["polygon", "https://polygon.llamarpc.com"],
        ["bsc", "https://binance.llamarpc.com"],
        ["optimism", "https://optimism.llamarpc.com"],
        ["arbitrum", "https://arbitrum.llamarpc.com"],
        ["ethereum-sepolia", "https://ethereum-sepolia.publicnode.com"],
        ["polygon-mumbai", "https://rpc-mumbai.maticvigil.com"],
        ["zkatana", "https://rpc.startale.com/zkatana"],
        ["arbitrum-sepolia", null],
        ["base-goerli", null],
        ["base-sepolia", null],
        ["bsc-testnet", null],
        ["ethereum-goerli", "https://ethereum-goerli.publicnode.com"],
        ["optimism-goerli", null],
        ["optimism-sepolia", null],
        ["zora-goerli", null],
        ["zora-sepolia", null],
        ["base", null],
        ["zora", null],
        ["arbitrumnova", null],
    ]).get(chain)!;

    if (url == null) {
        throw new Error(`Url provider not found for chain ${chain}`);
    }
    return url;
}

export function getBlockExplorerByBlockchain(chain: EVMBlockchainIncludingTestnet) {
    const blockExplorer = new Map<EVMBlockchainIncludingTestnet, string | null>([
        ["ethereum", "https://etherscan.io"],
        ["polygon", "https://polygonscan.com"],
        ["bsc", "https://bscscan.com"],
        ["optimism", "https://optimistic.etherscan.io"],
        ["arbitrum", "https://arbiscan.io"],
        ["ethereum-goerli", "https://goerli.etherscan.io"],
        ["ethereum-sepolia", "https://sepolia.etherscan.io"],
        ["polygon-mumbai", "https://mumbai.polygonscan.com"],
        ["zkatana", "https://zkatana.explorer.startale.com"],
        ["arbitrum-sepolia", null],
        ["base-goerli", null],
        ["base-sepolia", null],
        ["bsc-testnet", null],
        ["optimism-goerli", null],
        ["optimism-sepolia", null],
        ["zora-goerli", null],
        ["zora-sepolia", null],
        ["base", null],
        ["zora", null],
        ["arbitrumnova", null],
    ]).get(chain)!;

    if (blockExplorer == null) {
        throw new Error(`Block Explorer not found for chain ${chain}`);
    }
    return blockExplorer;
}

export function getDisplayNameByBlockchain(chain: EVMBlockchainIncludingTestnet) {
    const displayName = new Map<EVMBlockchainIncludingTestnet, string>([
        ["ethereum", "Ethereum Mainnet"],
        ["polygon", "Polygon Mainnet"],
        ["bsc", "BNB Smart Chain"],
        ["optimism", "Optimism"],
        ["arbitrum", "Arbitrum"],
        ["ethereum-goerli", "Goerli Tesnet"],
        ["ethereum-sepolia", "Sepolia Tesnet"],
        ["polygon-mumbai", "Mumbai Tesnet"],
        ["zkatana", "zKatana"],
        ["arbitrum-sepolia", "Arbitrum Testnet"],
        ["base-goerli", "Base Goerli Testnet"],
        ["base-sepolia", "Base Testnet"],
        ["bsc-testnet", "BNB Smart Chain Testnet"],
        ["optimism-goerli", "Optimism Goerli Testnet"],
        ["optimism-sepolia", "Optimism Testnet"],
        ["zora-goerli", "Zora Goerli Testnet"],
        ["zora-sepolia", "Zora Testnet"],
        ["base", "Base"],
        ["zora", "Zora"],
        ["arbitrumnova", "Arbitrum Nova"],
    ]).get(chain)!;

    if (displayName == null) {
        throw new Error(`Display name not found for chain ${chain}`);
    }
    return displayName;
}

export function getTickerByBlockchain(chain: EVMBlockchainIncludingTestnet) {
    const ticker = new Map<EVMBlockchainIncludingTestnet, string | null>([
        ["ethereum", "ETH"],
        ["polygon", "MATIC"],
        ["bsc", "BNB"],
        ["optimism", "OP"],
        ["arbitrum", "ARB"],
        ["ethereum-goerli", "ETH"],
        ["ethereum-sepolia", "ETH"],
        ["polygon-mumbai", "MATIC"],
        ["zkatana", "ETH"],
        ["arbitrum-sepolia", null],
        ["base-goerli", null],
        ["base-sepolia", null],
        ["bsc-testnet", null],
        ["optimism-goerli", null],
        ["optimism-sepolia", null],
        ["zora-goerli", null],
        ["zora-sepolia", null],
        ["base", null],
        ["zora", null],
        ["arbitrumnova", null],
    ]).get(chain)!;

    if (ticker == null) {
        throw new Error(`Ticker project id not found for chain ${chain}`);
    }
    return ticker;
}

export function getTickerNameByBlockchain(chain: EVMBlockchainIncludingTestnet) {
    const tickerName = new Map<EVMBlockchainIncludingTestnet, string | null>([
        ["ethereum", "ETHEREUM"],
        ["polygon", "MATIC"],
        ["bsc", "BNB_BSC"],
        ["optimism", "OPTIMISM"],
        ["arbitrum", "ARBITRUM"],
        ["ethereum-goerli", "ETHEREUM"],
        ["ethereum-sepolia", "ETHEREUM"],
        ["polygon-mumbai", "MATIC"],
        ["zkatana", "ETHEREUM"],
        ["arbitrum-sepolia", null],
        ["base-goerli", null],
        ["base-sepolia", null],
        ["bsc-testnet", null],
        ["optimism-goerli", null],
        ["optimism-sepolia", null],
        ["zora-goerli", null],
        ["zora-sepolia", null],
        ["base", null],
        ["zora", null],
        ["arbitrumnova", null],
    ]).get(chain)!;

    if (tickerName == null) {
        throw new Error(`Ticker Name project id not found for chain ${chain}`);
    }
    return tickerName;
}

export function getZeroDevProjectIdByBlockchain(chain: EVMBlockchainIncludingTestnet) {
    const zeroDevProjectId = new Map<EVMBlockchainIncludingTestnet, string | null>([
        ["ethereum", ZD_ETHEREUM_PROJECT_ID],
        ["polygon", ZD_POLYGON_PROJECT_ID],
        ["bsc", ZD_BSC_PROJECT_ID],
        ["optimism", ZD_OPTIMISM_PROJECT_ID],
        ["arbitrum", ZD_ARBITRUM_PROJECT_ID],
        ["ethereum-goerli", ZD_GOERLI_PROJECT_ID],
        ["ethereum-sepolia", ZD_SEPOLIA_PROJECT_ID],
        ["polygon-mumbai", ZD_MUMBAI_PROJECT_ID],
        ["zkatana", ZD_ZKATANA_PROJECT_ID],
        ["arbitrum-sepolia", null],
        ["base-goerli", null],
        ["base-sepolia", null],
        ["bsc-testnet", null],
        ["optimism-goerli", null],
        ["optimism-sepolia", null],
        ["zora-goerli", null],
        ["zora-sepolia", null],
        ["base", null],
        ["zora", null],
        ["arbitrumnova", null],
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
        case "ethereum-goerli":
            return goerli;
        case "ethereum-sepolia":
            return sepolia;
        case "polygon-mumbai":
            return polygonMumbai;
        default:
            throw new Error(`Unsupported network: ${networkName}`);
    }
}
