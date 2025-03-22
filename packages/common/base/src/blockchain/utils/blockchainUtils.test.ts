import { describe, expect, test } from "vitest";
import { blockchainToDisplayName } from "./blockchainToCopyName";
import { isBlockchain } from "./isBlockchain";
import { isBlockchainIncludingTestnets } from "./isBlockchainIncludingTestnets";
import { BLOCKCHAINS, BLOCKCHAINS_INCLUDING_TESTNETS, type Blockchain, type BlockchainIncludingTestnet } from "../types";

describe("blockchainUtils", () => {
    describe("blockchainToDisplayName", () => {
        test("should return correct display name for mainnet blockchains", () => {
            expect(blockchainToDisplayName("ethereum")).toBe("Ethereum");
            expect(blockchainToDisplayName("solana")).toBe("Solana");
            expect(blockchainToDisplayName("polygon")).toBe("Polygon");
        });

        test("should return correct display name for testnet blockchains", () => {
            expect(blockchainToDisplayName("ethereum-sepolia")).toBe("Ethereum Sepolia");
            expect(blockchainToDisplayName("polygon-mumbai")).toBe("Polygon Mumbai");
            expect(blockchainToDisplayName("base-goerli")).toBe("Base Goerli");
        });

        test("should handle all blockchain types", () => {
            // Test that all blockchains in the type have a corresponding display name
            for (const blockchain of BLOCKCHAINS_INCLUDING_TESTNETS) {
                const displayName = blockchainToDisplayName(blockchain);
                expect(typeof displayName).toBe("string");
                expect(displayName.length).toBeGreaterThan(0);
            }
        });
    });

    describe("isBlockchain", () => {
        test("should return true for valid mainnet blockchains", () => {
            expect(isBlockchain("ethereum")).toBe(true);
            expect(isBlockchain("solana")).toBe(true);
            expect(isBlockchain("polygon")).toBe(true);
        });

        test("should return false for testnet blockchains", () => {
            expect(isBlockchain("ethereum-sepolia")).toBe(false);
            expect(isBlockchain("polygon-mumbai")).toBe(false);
            expect(isBlockchain("base-goerli")).toBe(false);
        });

        test("should return false for invalid values", () => {
            expect(isBlockchain("invalid")).toBe(false);
            expect(isBlockchain(123)).toBe(false);
            expect(isBlockchain(null)).toBe(false);
            expect(isBlockchain(undefined)).toBe(false);
        });

        test("should work with type parameter", () => {
            const value: unknown = "ethereum";
            if (isBlockchain<"ethereum">(value)) {
                expect(value).toBe("ethereum");
            }
        });

        test("should work with expected blockchain parameter", () => {
            expect(isBlockchain("ethereum", "ethereum")).toBe(true);
            expect(isBlockchain("ethereum", "solana")).toBe(false);
        });
    });

    describe("isBlockchainIncludingTestnets", () => {
        test("should return true for valid mainnet blockchains", () => {
            expect(isBlockchainIncludingTestnets("ethereum")).toBe(true);
            expect(isBlockchainIncludingTestnets("solana")).toBe(true);
            expect(isBlockchainIncludingTestnets("polygon")).toBe(true);
        });

        test("should return true for valid testnet blockchains", () => {
            expect(isBlockchainIncludingTestnets("ethereum-sepolia")).toBe(true);
            expect(isBlockchainIncludingTestnets("polygon-mumbai")).toBe(true);
            expect(isBlockchainIncludingTestnets("base-goerli")).toBe(true);
        });

        test("should return false for invalid values", () => {
            expect(isBlockchainIncludingTestnets("invalid")).toBe(false);
            expect(isBlockchainIncludingTestnets(123)).toBe(false);
            expect(isBlockchainIncludingTestnets(null)).toBe(false);
            expect(isBlockchainIncludingTestnets(undefined)).toBe(false);
        });

        test("should work with type parameter", () => {
            const value: unknown = "ethereum-sepolia";
            if (isBlockchainIncludingTestnets<"ethereum-sepolia">(value)) {
                expect(value).toBe("ethereum-sepolia");
            }
        });

        test("should work with expected blockchain parameter", () => {
            expect(isBlockchainIncludingTestnets("ethereum-sepolia", "ethereum-sepolia")).toBe(true);
            expect(isBlockchainIncludingTestnets("ethereum-sepolia", "ethereum")).toBe(false);
        });

        test("should handle all blockchain types including testnets", () => {
            // Test that all blockchains in the type are recognized
            for (const blockchain of BLOCKCHAINS_INCLUDING_TESTNETS) {
                expect(isBlockchainIncludingTestnets(blockchain)).toBe(true);
            }
        });
    });
}); 