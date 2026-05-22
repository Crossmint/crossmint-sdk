import { describe, it, expect } from "vitest";
import { deriveKeyBytes, deriveAlias } from "./server-key-derivation";

const TEST_SECRET = "a".repeat(64);
const TEST_SECRET_PREFIXED = `xmsk1_${"a".repeat(64)}`;
const PROJECT_ID = "project-123";
const ENVIRONMENT = "staging";

describe("deriveKeyBytes", () => {
    it("returns 32 bytes", () => {
        const result = deriveKeyBytes(TEST_SECRET, PROJECT_ID, ENVIRONMENT, "evm");
        expect(result).toBeInstanceOf(Uint8Array);
        expect(result.length).toBe(32);
    });

    it("strips xmsk1_ prefix and produces same result", () => {
        const withPrefix = deriveKeyBytes(TEST_SECRET_PREFIXED, PROJECT_ID, ENVIRONMENT, "evm");
        const withoutPrefix = deriveKeyBytes(TEST_SECRET, PROJECT_ID, ENVIRONMENT, "evm");
        expect(withPrefix).toEqual(withoutPrefix);
    });

    it("is deterministic", () => {
        const a = deriveKeyBytes(TEST_SECRET, PROJECT_ID, ENVIRONMENT, "evm");
        const b = deriveKeyBytes(TEST_SECRET, PROJECT_ID, ENVIRONMENT, "evm");
        expect(a).toEqual(b);
    });

    it("produces different keys for different chains", () => {
        const evm = deriveKeyBytes(TEST_SECRET, PROJECT_ID, ENVIRONMENT, "evm");
        const solana = deriveKeyBytes(TEST_SECRET, PROJECT_ID, ENVIRONMENT, "solana");
        const stellar = deriveKeyBytes(TEST_SECRET, PROJECT_ID, ENVIRONMENT, "stellar");
        expect(evm).not.toEqual(solana);
        expect(evm).not.toEqual(stellar);
        expect(solana).not.toEqual(stellar);
    });

    it("produces different keys for different environments", () => {
        const staging = deriveKeyBytes(TEST_SECRET, PROJECT_ID, "staging", "evm");
        const production = deriveKeyBytes(TEST_SECRET, PROJECT_ID, "production", "evm");
        expect(staging).not.toEqual(production);
    });

    it("produces different keys for different projects", () => {
        const a = deriveKeyBytes(TEST_SECRET, "project-a", ENVIRONMENT, "evm");
        const b = deriveKeyBytes(TEST_SECRET, "project-b", ENVIRONMENT, "evm");
        expect(a).not.toEqual(b);
    });
});

describe("deriveAlias", () => {
    it("starts with s- prefix", () => {
        const alias = deriveAlias(TEST_SECRET, PROJECT_ID, ENVIRONMENT, "base-sepolia");
        expect(alias.startsWith("s-")).toBe(true);
    });

    it("is at most 36 characters", () => {
        const alias = deriveAlias(TEST_SECRET, PROJECT_ID, ENVIRONMENT, "base-sepolia");
        expect(alias.length).toBeLessThanOrEqual(36);
    });

    it("is deterministic", () => {
        const a = deriveAlias(TEST_SECRET, PROJECT_ID, ENVIRONMENT, "base-sepolia");
        const b = deriveAlias(TEST_SECRET, PROJECT_ID, ENVIRONMENT, "base-sepolia");
        expect(a).toBe(b);
    });

    it("strips xmsk1_ prefix and produces same result", () => {
        const withPrefix = deriveAlias(TEST_SECRET_PREFIXED, PROJECT_ID, ENVIRONMENT, "base-sepolia");
        const withoutPrefix = deriveAlias(TEST_SECRET, PROJECT_ID, ENVIRONMENT, "base-sepolia");
        expect(withPrefix).toBe(withoutPrefix);
    });

    it("produces different aliases for different chain types", () => {
        const evm = deriveAlias(TEST_SECRET, PROJECT_ID, ENVIRONMENT, "base-sepolia");
        const solana = deriveAlias(TEST_SECRET, PROJECT_ID, ENVIRONMENT, "solana");
        expect(evm).not.toBe(solana);
    });

    it("normalizes EVM chains to the same alias", () => {
        const baseSepolia = deriveAlias(TEST_SECRET, PROJECT_ID, ENVIRONMENT, "base-sepolia");
        const polygon = deriveAlias(TEST_SECRET, PROJECT_ID, ENVIRONMENT, "polygon");
        const arbitrum = deriveAlias(TEST_SECRET, PROJECT_ID, ENVIRONMENT, "arbitrum");
        expect(baseSepolia).toBe(polygon);
        expect(baseSepolia).toBe(arbitrum);
    });
});
