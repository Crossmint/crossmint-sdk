import { APIKeyEnvironmentPrefix, BlockchainIncludingTestnet as Blockchain } from "@crossmint/common-sdk-base";
import { walletsLogger } from "../logger";
import { InvalidChainError, InvalidEnvironmentError } from "../utils/errors";
import type { Chain as ViemChain } from "viem";
import {
    baseSepolia,
    base,
    polygonAmoy,
    polygon,
    optimismSepolia,
    optimism,
    arbitrumSepolia,
    arbitrum,
    arbitrumNova,
    modeTestnet,
    mode,
    bsc,
    shape,
    zora,
    zoraSepolia,
    sepolia,
    flowMainnet,
    flowTestnet,
    plume,
    plumeTestnet,
} from "viem/chains";

import { arcTestnet } from "./definitions/arcTestnet";
import { story } from "./definitions/story";
import { storyTestnet } from "./definitions/storyTestnet";
import { tempo } from "./definitions/tempo";
import { tempoTestnet } from "./definitions/tempoTestnet";

const TESTNET_AA_CHAINS = [
    Blockchain.ABSTRACT_TESTNET,
    Blockchain.ARBITRUM_SEPOLIA,
    Blockchain.BASE_SEPOLIA,
    Blockchain.CURTIS,
    Blockchain.ETHEREUM_SEPOLIA,
    Blockchain.FLOW_TESTNET,
    Blockchain.MANTLE_SEPOLIA,
    Blockchain.MODE_SEPOLIA,
    Blockchain.OPTIMISM_SEPOLIA,
    Blockchain.PLUME_TESTNET,
    Blockchain.POLYGON_AMOY,
    Blockchain.SCROLL_SEPOLIA,
    Blockchain.SEI_ATLANTIC_2_TESTNET,
    Blockchain.STORY_TESTNET,
    Blockchain.WORLD_CHAIN_SEPOLIA,
    Blockchain.ZORA_SEPOLIA,
    Blockchain.ARC_TESTNET,
    Blockchain.TEMPO_TESTNET,
] as const;

const PRODUCTION_AA_CHAINS = [
    Blockchain.ABSTRACT,
    Blockchain.APECHAIN,
    Blockchain.ARBITRUM,
    Blockchain.ARBITRUMNOVA,
    Blockchain.BASE,
    Blockchain.BSC,
    Blockchain.FLOW,
    Blockchain.MANTLE,
    Blockchain.MODE,
    Blockchain.OPTIMISM,
    Blockchain.PLUME,
    Blockchain.POLYGON,
    Blockchain.SCROLL,
    Blockchain.SEI_PACIFIC_1,
    Blockchain.SHAPE,
    Blockchain.STORY,
    Blockchain.TEMPO,
    Blockchain.WORLDCHAIN,
    Blockchain.ZORA,
] as const;

export type EVMSmartWalletTestnet = (typeof TESTNET_AA_CHAINS)[number];
export type EVMSmartWalletMainnet = (typeof PRODUCTION_AA_CHAINS)[number];
export type EVMSmartWalletChain = EVMSmartWalletTestnet | EVMSmartWalletMainnet;

export function toViemChain(chain: EVMSmartWalletChain): ViemChain {
    switch (chain) {
        case Blockchain.BASE_SEPOLIA:
            return baseSepolia;
        case Blockchain.BASE:
            return base;
        case Blockchain.POLYGON_AMOY:
            return polygonAmoy;
        case Blockchain.POLYGON:
            return polygon;
        case Blockchain.OPTIMISM_SEPOLIA:
            return optimismSepolia;
        case Blockchain.OPTIMISM:
            return optimism;
        case Blockchain.ARBITRUM_SEPOLIA:
            return arbitrumSepolia;
        case Blockchain.ARBITRUM:
            return arbitrum;
        case Blockchain.ARBITRUMNOVA:
            return arbitrumNova;
        case Blockchain.STORY_TESTNET:
            return storyTestnet;
        case Blockchain.STORY:
            return story;
        case Blockchain.MODE_SEPOLIA:
            return modeTestnet;
        case Blockchain.MODE:
            return mode;
        case Blockchain.BSC:
            return bsc;
        case Blockchain.SHAPE:
            return shape;
        case Blockchain.ZORA:
            return zora;
        case Blockchain.ZORA_SEPOLIA:
            return zoraSepolia;
        case Blockchain.ETHEREUM_SEPOLIA:
            return sepolia;
        case Blockchain.FLOW:
            return flowMainnet;
        case Blockchain.FLOW_TESTNET:
            return flowTestnet;
        case Blockchain.PLUME_TESTNET:
            return plumeTestnet;
        case Blockchain.PLUME:
            return plume;
        case Blockchain.ARC_TESTNET:
            return arcTestnet;
        case Blockchain.TEMPO:
            return tempo;
        case Blockchain.TEMPO_TESTNET:
            return tempoTestnet;
        case Blockchain.ABSTRACT:
        case Blockchain.ABSTRACT_TESTNET:
        case Blockchain.APECHAIN:
        case Blockchain.MANTLE:
        case Blockchain.MANTLE_SEPOLIA:
        case Blockchain.SCROLL:
        case Blockchain.SCROLL_SEPOLIA:
        case Blockchain.SEI_PACIFIC_1:
        case Blockchain.SEI_ATLANTIC_2_TESTNET:
        case Blockchain.CURTIS:
        case Blockchain.WORLDCHAIN:
        case Blockchain.WORLD_CHAIN_SEPOLIA:
            throw new Error(
                `Chain ${chain} is not yet supported in toViemChain function. Please add the appropriate viem chain definition.`
            );
        default:
            throw new Error(`Unknown chain: ${chain}`);
    }
}

export type SolanaChain = "solana";
export type StellarChain = "stellar";
export type EVMChain = EVMSmartWalletChain;

export type Chain = SolanaChain | EVMChain | StellarChain;

export function isTestnetChain(chain: EVMSmartWalletChain): chain is EVMSmartWalletTestnet {
    return (TESTNET_AA_CHAINS as readonly string[]).includes(chain);
}

export function isMainnetChain(chain: EVMSmartWalletChain): chain is EVMSmartWalletMainnet {
    return (PRODUCTION_AA_CHAINS as readonly string[]).includes(chain);
}

const MAINNET_TO_TESTNET_MAP: Partial<Record<EVMSmartWalletMainnet, EVMSmartWalletTestnet>> = {
    [Blockchain.ABSTRACT]: Blockchain.ABSTRACT_TESTNET,
    [Blockchain.APECHAIN]: Blockchain.CURTIS,
    [Blockchain.ARBITRUM]: Blockchain.ARBITRUM_SEPOLIA,
    [Blockchain.BASE]: Blockchain.BASE_SEPOLIA,
    [Blockchain.FLOW]: Blockchain.FLOW_TESTNET,
    [Blockchain.MANTLE]: Blockchain.MANTLE_SEPOLIA,
    [Blockchain.MODE]: Blockchain.MODE_SEPOLIA,
    [Blockchain.OPTIMISM]: Blockchain.OPTIMISM_SEPOLIA,
    [Blockchain.PLUME]: Blockchain.PLUME_TESTNET,
    [Blockchain.POLYGON]: Blockchain.POLYGON_AMOY,
    [Blockchain.SCROLL]: Blockchain.SCROLL_SEPOLIA,
    [Blockchain.SEI_PACIFIC_1]: Blockchain.SEI_ATLANTIC_2_TESTNET,
    [Blockchain.STORY]: Blockchain.STORY_TESTNET,
    [Blockchain.WORLDCHAIN]: Blockchain.WORLD_CHAIN_SEPOLIA,
    [Blockchain.ZORA]: Blockchain.ZORA_SEPOLIA,
    [Blockchain.TEMPO]: Blockchain.TEMPO_TESTNET,
};

export function mainnetToTestnet(chain: EVMSmartWalletMainnet): EVMSmartWalletTestnet | undefined {
    return MAINNET_TO_TESTNET_MAP[chain];
}

/**
 * Validates that a chain is appropriate for the given environment.
 * In production, only mainnet chains are allowed - throws if a testnet chain is used.
 * In non-production environments, mainnet chains are automatically converted to their testnet equivalent.
 *
 * @param chain - The chain to validate
 * @param environment - The API key environment prefix
 * @returns The validated (and potentially converted) chain
 */
export function isValidChain(chain: string): chain is Chain {
    return (
        chain === "solana" ||
        chain === "stellar" ||
        isTestnetChain(chain as EVMSmartWalletChain) ||
        isMainnetChain(chain as EVMSmartWalletChain)
    );
}

export function validateChainForEnvironment<C extends Chain>(chain: C, environment: APIKeyEnvironmentPrefix): C {
    if (!isValidChain(chain)) {
        throw new InvalidChainError(
            `Unknown chain "${chain}". Please use a supported chain name (e.g. "base-sepolia", "polygon", "solana", "stellar").`
        );
    }

    if (chain === "solana" || chain === "stellar") {
        return chain;
    }

    const evmChain = chain as EVMSmartWalletChain;
    const isProductionEnv = environment === APIKeyEnvironmentPrefix.PRODUCTION;

    if (isProductionEnv && isTestnetChain(evmChain)) {
        throw new InvalidEnvironmentError(
            `Chain "${chain}" is a testnet chain and cannot be used in production. Please use a mainnet chain instead.`
        );
    }

    if (!isProductionEnv && isMainnetChain(evmChain)) {
        const testnetEquivalent = mainnetToTestnet(evmChain);
        if (testnetEquivalent != null) {
            walletsLogger.debug("validateChainForEnvironment.autoConverted", {
                chain,
                convertedTo: testnetEquivalent,
                environment,
                message: `Chain "${chain}" is a mainnet chain and cannot be used in ${environment} environment. Automatically converted to "${testnetEquivalent}".`,
            });
            return testnetEquivalent as unknown as C;
        }
        walletsLogger.debug("validateChainForEnvironment.mismatch", {
            chain,
            environment,
            message: `Chain "${chain}" is a mainnet chain and should not be used in ${environment} environment. No testnet equivalent is available. Please use a testnet chain instead.`,
        });
    }

    return chain;
}
