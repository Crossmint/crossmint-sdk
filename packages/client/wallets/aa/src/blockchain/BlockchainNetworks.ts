import {
    BUNDLER_RPC,
    PAYMASTER_RPC,
    PM_BASE_RPC,
    PM_BASE_SEPOLIA_RPC,
    ZD_AMOY_PROJECT_ID,
    ZD_ARBITRUM_NOVA_PROJECT_ID,
    ZD_ARBITRUM_PROJECT_ID,
    ZD_ARBITRUM_SEPOLIA_PROJECT_ID,
    ZD_ASTAR_PROJECT_ID,
    ZD_BASE_PROJECT_ID,
    ZD_BASE_SEPOLIA_PROJECT_ID,
    ZD_BSC_PROJECT_ID,
    ZD_ETHEREUM_PROJECT_ID,
    ZD_GOERLI_PROJECT_ID,
    ZD_OPTIMISM_PROJECT_ID,
    ZD_OPTIMISM_SEPOLIA_PROJECT_ID,
    ZD_POLYGON_PROJECT_ID,
    ZD_SEPOLIA_PROJECT_ID,
    ZD_ZKATANA_PROJECT_ID,
} from "@/utils";
import { EntryPoint } from "permissionless/types/entrypoint";
import {
    Chain,
    arbitrum,
    arbitrumNova,
    arbitrumSepolia,
    astarZkEVM,
    base,
    baseSepolia,
    bsc,
    goerli,
    mainnet,
    optimism,
    optimismSepolia,
    polygon,
    polygonAmoy,
    sepolia,
} from "viem/chains";

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
        ["polygon-amoy", "AMOY_POLYGON_TEST"],
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
        ["base", "ETH"],
        ["astar-zkevm", "ETH"],
        ["apex", "ETH"],
        ["arbitrumnova", "ETH-AETH"],
    ]).get(chain)!;

    if (assetId == null) {
        throw new Error(`Asset not found for chain ${chain}`);
    }
    return assetId;
}

export function getUrlProviderByBlockchain(chain: EVMBlockchainIncludingTestnet) {
    const url = new Map<EVMBlockchainIncludingTestnet, string | null>([
        ["ethereum", "https://eth.llamarpc.com"],
        ["polygon", "https://rpc.ankr.com/polygon"],
        ["bsc", "https://binance.llamarpc.com"],
        ["optimism", "https://rpc.ankr.com/optimism"],
        ["arbitrum", "https://rpc.ankr.com/arbitrum"],
        ["ethereum-sepolia", "https://ethereum-sepolia.publicnode.com"],
        ["polygon-amoy", "https://rpc-amoy.polygon.technology"],
        ["zkatana", "https://rpc.startale.com/zkatana"],
        ["arbitrum-sepolia", "https://sepolia-rollup.arbitrum.io/rpc"],
        ["base-goerli", null],
        ["base-sepolia", "https://base-sepolia-rpc.publicnode.com"],
        ["bsc-testnet", null],
        ["ethereum-goerli", "https://ethereum-goerli.publicnode.com"],
        ["optimism-goerli", null],
        ["optimism-sepolia", "https://sepolia.optimism.io"],
        ["zora-goerli", null],
        ["zora-sepolia", null],
        ["base", "https://mainnet.base.org"],
        ["zora", null],
        ["arbitrumnova", "https://arbitrum-nova-rpc.publicnode.com"],
        ["astar-zkevm", "https://rpc.startale.com/astar-zkevm"],
        ["apex", null],
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
        ["polygon-amoy", "https://www.oklink.com/amoy"],
        ["zkatana", "https://zkatana.blockscout.com"],
        ["arbitrum-sepolia", "https://sepolia.arbiscan.io"],
        ["base-goerli", "https://goerli.basescan.org"],
        ["base-sepolia", "https://sepolia.basescan.org"],
        ["bsc-testnet", "https://testnet.bscscan.com"],
        ["optimism-goerli", "https://goerli-optimism.etherscan.io"],
        ["optimism-sepolia", "https://sepolia-optimism.etherscan.io/"],
        ["zora-goerli", null],
        ["zora-sepolia", "https://sepolia.explorer.zora.energy"],
        ["base", "https://basescan.org"],
        ["zora", "https://explorer.zora.energy"],
        ["arbitrumnova", "https://nova.arbiscan.io/"],
        ["astar-zkevm", "https://astar-zkevm.explorer.startale.com"],
        ["apex", "https://explorer.apex.proofofplay.com/"],
    ]).get(chain)!;

    if (blockExplorer == null) {
        throw new Error(`Block Explorer not found for chain ${chain}`);
    }
    return blockExplorer;
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
        ["polygon-amoy", "MATIC"],
        ["zkatana", "ETH"],
        ["arbitrum-sepolia", "ETH"],
        ["base-goerli", null],
        ["base-sepolia", "ETH"],
        ["bsc-testnet", null],
        ["optimism-goerli", null],
        ["optimism-sepolia", "ETH"],
        ["zora-goerli", null],
        ["zora-sepolia", null],
        ["base", "ETH"],
        ["zora", null],
        ["arbitrumnova", "ETH"],
        ["astar-zkevm", "ETH"],
        ["apex", null],
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
        ["polygon-amoy", "MATIC"],
        ["zkatana", "ETHEREUM"],
        ["arbitrum-sepolia", "ETHEREUM"],
        ["base-goerli", null],
        ["base-sepolia", "ETHEREUM"],
        ["bsc-testnet", null],
        ["optimism-goerli", null],
        ["optimism-sepolia", "ETHEREUM"],
        ["zora-goerli", null],
        ["zora-sepolia", null],
        ["base", "ETHEREUM"],
        ["zora", null],
        ["arbitrumnova", "ETHEREUM"],
        ["astar-zkevm", "ETHEREUM"],
        ["apex", null],
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
        ["polygon-amoy", ZD_AMOY_PROJECT_ID],
        ["zkatana", ZD_ZKATANA_PROJECT_ID],
        ["arbitrum-sepolia", ZD_ARBITRUM_SEPOLIA_PROJECT_ID],
        ["base-goerli", null],
        ["base-sepolia", ZD_BASE_SEPOLIA_PROJECT_ID],
        ["bsc-testnet", null],
        ["optimism-goerli", null],
        ["optimism-sepolia", ZD_OPTIMISM_SEPOLIA_PROJECT_ID],
        ["zora-goerli", null],
        ["zora-sepolia", null],
        ["base", ZD_BASE_PROJECT_ID],
        ["zora", null],
        ["arbitrumnova", ZD_ARBITRUM_NOVA_PROJECT_ID],
        ["astar-zkevm", ZD_ASTAR_PROJECT_ID],
        ["apex", null],
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
        case "arbitrumnova":
            return arbitrumNova;
        case "base":
            return base;
        case "base-sepolia":
            return baseSepolia;
        case "ethereum-goerli":
            return goerli;
        case "ethereum-sepolia":
            return sepolia;
        case "polygon-amoy":
            return polygonAmoy;
        case "astar-zkevm":
            return astarZkEVM;
        case "optimism-sepolia":
            return optimismSepolia;
        case "arbitrum-sepolia":
            return arbitrumSepolia;
        default:
            throw new Error(`Unsupported network: ${networkName}`);
    }
}

export function getBundlerRPC(chain: EVMBlockchainIncludingTestnet): string {
    switch (chain) {
        case EVMBlockchainIncludingTestnet.BASE_SEPOLIA:
            return PM_BASE_SEPOLIA_RPC;
        case EVMBlockchainIncludingTestnet.BASE:
            return PM_BASE_RPC;
        default:
            return BUNDLER_RPC + getZeroDevProjectIdByBlockchain(chain) + "?bundlerProvider=STACKUP";
    }
}

export function getPaymasterRPC(chain: EVMBlockchainIncludingTestnet): string {
    switch (chain) {
        case EVMBlockchainIncludingTestnet.BASE_SEPOLIA:
            return PM_BASE_SEPOLIA_RPC;
        case EVMBlockchainIncludingTestnet.BASE:
            return PM_BASE_RPC;
        default:
            return PAYMASTER_RPC + getZeroDevProjectIdByBlockchain(chain) + "?paymasterProvider=STACKUP";
    }
}

export type entryPoint = EntryPoint;
export type TChain = Chain | undefined;
