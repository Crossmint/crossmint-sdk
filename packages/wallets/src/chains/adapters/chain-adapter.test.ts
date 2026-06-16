import { describe, expect, it } from "vitest";
import { InvalidSignerError } from "../../utils/errors";
import { getChainAdapter } from "../chain-adapter";

describe("chain-adapter", () => {
    describe("nativeToken", () => {
        it.each([
            ["base-sepolia", "eth"],
            ["solana", "sol"],
            ["stellar", "xlm"],
        ] as const)("%s -> %s", (chain, token) => {
            expect(getChainAdapter(chain).nativeToken).toBe(token);
        });
    });

    describe("walletLocatorPrefix", () => {
        it.each([
            ["base-sepolia", "me:evm:smart"],
            ["solana", "me:solana:smart"],
            ["stellar", "me:stellar:smart"],
        ] as const)("%s -> %s", (chain, prefix) => {
            expect(getChainAdapter(chain).walletLocatorPrefix).toBe(prefix);
        });
    });

    describe("supportsSignatures", () => {
        it.each([
            ["base-sepolia", true],
            ["solana", false],
            ["stellar", true],
        ] as const)("%s -> %s", (chain, supports) => {
            expect(getChainAdapter(chain).supportsSignatures).toBe(supports);
        });
    });

    describe("addSignerChain", () => {
        it("evm returns the concrete chain", () => {
            expect(getChainAdapter("base-sepolia").addSignerChain("base-sepolia")).toBe("base-sepolia");
        });

        it.each(["solana", "stellar"] as const)("%s returns undefined", (chain) => {
            expect(getChainAdapter(chain).addSignerChain(chain)).toBeUndefined();
        });
    });

    describe("extractAddSignerOperation", () => {
        it.each(["solana", "stellar"] as const)("%s maps transaction to transaction operation", (chain) => {
            expect(
                getChainAdapter(chain).extractAddSignerOperation({ transaction: { id: "tx-1" } } as any, chain)
            ).toEqual({ type: "transaction", id: "tx-1" });
        });

        it("evm delegates to getPendingSignerOperation and returns a pending signature operation", () => {
            const response = { chains: { "base-sepolia": { id: "sig-1", status: "pending" } } } as any;
            expect(getChainAdapter("base-sepolia").extractAddSignerOperation(response, "base-sepolia")).toEqual({
                type: "signature",
                id: "sig-1",
            });
        });

        it("evm delegates to getPendingSignerOperation and returns null when not pending", () => {
            const response = { chains: { "base-sepolia": { id: "sig-1", status: "success" } } } as any;
            expect(getChainAdapter("base-sepolia").extractAddSignerOperation(response, "base-sepolia")).toBeNull();
        });
    });

    describe("assertAddSignerSucceeded", () => {
        it("evm throws when chains missing", () => {
            expect(() =>
                getChainAdapter("base-sepolia").assertAddSignerSucceeded(
                    {} as any,
                    "base-sepolia",
                    "me:evm:smart",
                    "api-key"
                )
            ).toThrow("Expected chains in response for EVM chain");
        });

        it("evm throws InvalidSignerError when chain status is failed", () => {
            const response = { chains: { "base-sepolia": { id: "sig-1", status: "failed" } } } as any;
            expect(() =>
                getChainAdapter("base-sepolia").assertAddSignerSucceeded(
                    response,
                    "base-sepolia",
                    "me:evm:smart",
                    "api-key"
                )
            ).toThrow(InvalidSignerError);
            expect(() =>
                getChainAdapter("base-sepolia").assertAddSignerSucceeded(
                    response,
                    "base-sepolia",
                    "me:evm:smart",
                    "api-key"
                )
            ).toThrow("Signer registration failed for chain base-sepolia (signer: me:evm:smart)");
        });

        it("evm does not throw for a healthy response", () => {
            const response = { chains: { "base-sepolia": { id: "sig-1", status: "success" } } } as any;
            expect(() =>
                getChainAdapter("base-sepolia").assertAddSignerSucceeded(
                    response,
                    "base-sepolia",
                    "me:evm:smart",
                    "api-key"
                )
            ).not.toThrow();
        });

        it.each(["solana", "stellar"] as const)("%s throws when transaction missing", (chain) => {
            expect(() =>
                getChainAdapter(chain).assertAddSignerSucceeded({} as any, chain, "me:smart", "api-key")
            ).toThrow("Expected transaction in response for Solana/Stellar chain");
        });

        it.each(["solana", "stellar"] as const)("%s does not throw with transaction", (chain) => {
            expect(() =>
                getChainAdapter(chain).assertAddSignerSucceeded(
                    { transaction: { id: "tx-1" } } as any,
                    chain,
                    "me:smart",
                    "api-key"
                )
            ).not.toThrow();
        });
    });

    describe("balanceTokenFields", () => {
        it.each([
            ["solana", { mintHash: "M" }, { mintHash: "M" }],
            ["stellar", { contractId: "C" }, { contractId: "C" }],
            ["base-sepolia", { contractAddress: "0xA" }, { contractAddress: "0xA" }],
        ] as const)("%s extracts its native field", (chain, chainData, expected) => {
            expect(getChainAdapter(chain).balanceTokenFields(chainData)).toEqual(expected);
        });

        it.each([
            ["solana", null],
            ["solana", {}],
            ["stellar", null],
            ["stellar", {}],
            ["base-sepolia", null],
            ["base-sepolia", {}],
        ] as const)("%s returns {} for %o chainData", (chain, chainData) => {
            expect(getChainAdapter(chain).balanceTokenFields(chainData)).toEqual({});
        });

        it.each(["solana", "stellar"] as const)(
            "%s falls back to contractAddress when its native field is absent",
            (chain) => {
                expect(getChainAdapter(chain).balanceTokenFields({ contractAddress: "0xA" })).toEqual({
                    contractAddress: "0xA",
                });
            }
        );
    });

    describe("emptyBalanceTokenFields", () => {
        it.each([
            ["solana", { mintHash: undefined }],
            ["stellar", { contractId: undefined }],
            ["base-sepolia", { contractAddress: undefined }],
        ] as const)("%s pins the undefined-valued key", (chain, expected) => {
            expect(getChainAdapter(chain).emptyBalanceTokenFields()).toStrictEqual(expected);
        });
    });
});
