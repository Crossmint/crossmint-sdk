import { blockchainToChainId } from "@crossmint/common-sdk-base";
import { describe, expect, test } from "vitest";

import {
    type EVMSmartWalletChain,
    isMainnetChain,
    isTestnetChain,
    isValidChain,
    mainnetToTestnet,
    toViemChain,
} from "./chains";

const NEW_SMART_WALLET_CHAINS: EVMSmartWalletChain[] = [
    "avalanche",
    "avalanche-fuji",
    "celo",
    "celo-sepolia",
    "robinhood-chain",
    "robinhood-chain-testnet",
];

describe("chains", () => {
    describe("when resolving a viem chain", () => {
        test.each(NEW_SMART_WALLET_CHAINS)("%s resolves to a viem chain with the registered chain id", (chain) => {
            expect(isValidChain(chain)).toBe(true);
            expect(toViemChain(chain).id).toBe(blockchainToChainId(chain));
        });
    });

    describe("when converting mainnet chains to their testnet", () => {
        test.each([
            ["avalanche", "avalanche-fuji"],
            ["celo", "celo-sepolia"],
            ["robinhood-chain", "robinhood-chain-testnet"],
        ] as const)("%s maps to %s", (mainnet, testnet) => {
            expect(isMainnetChain(mainnet)).toBe(true);
            expect(isTestnetChain(testnet)).toBe(true);
            expect(mainnetToTestnet(mainnet)).toBe(testnet);
        });
    });
});
