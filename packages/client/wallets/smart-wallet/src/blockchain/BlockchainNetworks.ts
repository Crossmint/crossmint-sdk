import {
    BUNDLER_RPC,
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
    ZD_ZKYOTO_PROJECT_ID,
} from "@/utils/constants";
import {
    arbitrum,
    arbitrumNova,
    arbitrumSepolia,
    astarZkEVM,
    astarZkyoto,
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

export const getZeroDevProjectIdByBlockchain = (chain: EVMBlockchainIncludingTestnet) => {
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
        ["zkyoto", ZD_ZKYOTO_PROJECT_ID],
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
};

export const getViemNetwork = (cmChain: EVMBlockchainIncludingTestnet) => {
    switch (cmChain) {
        case "ethereum":
            return mainnet;
        case "ethereum-goerli":
            return goerli;
        case "ethereum-sepolia":
            return sepolia;
        case "polygon":
            return polygon;
        case "polygon-amoy":
            return polygonAmoy;
        case "optimism":
            return optimism;
        case "optimism-sepolia":
            return optimismSepolia;
        case "arbitrum":
            return arbitrum;
        case "arbitrumnova":
            return arbitrumNova;
        case "arbitrum-sepolia":
            return arbitrumSepolia;
        case "base":
            return base;
        case "base-sepolia":
            return baseSepolia;
        case "zkyoto":
            return astarZkyoto;
        case "astar-zkevm":
            return astarZkEVM;
        case "bsc":
            return bsc;
        default:
            throw new Error(`Unsupported network: ${cmChain}`);
    }
};

export const getBundlerRPC = (chain: EVMBlockchainIncludingTestnet) => {
    switch (chain) {
        case EVMBlockchainIncludingTestnet.BASE_SEPOLIA:
            return PM_BASE_SEPOLIA_RPC;
        case EVMBlockchainIncludingTestnet.BASE:
            return PM_BASE_RPC;
        default:
            return BUNDLER_RPC + getZeroDevProjectIdByBlockchain(chain) + "?bundlerProvider=STACKUP";
    }
};
