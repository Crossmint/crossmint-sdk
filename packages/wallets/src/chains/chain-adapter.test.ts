import { describe, expect, it, test, vi } from "vitest";
import base58 from "bs58";
import { Keypair, TransactionMessage } from "@solana/web3.js";
import { InvalidSignerError } from "../utils/errors";
import type { SignerAdapter } from "../signers/types";
import { VERSION_1_MESSAGE } from "../signers/solana-version-1.fixture";
import { getChainAdapter, isSupportedChainType } from "./chain-adapter";

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
            ["stellar", false],
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

    describe("isSupportedChainType", () => {
        it.each(["evm", "solana", "stellar"])("returns true for supported chain type %o", (chainType) => {
            expect(isSupportedChainType(chainType)).toBe(true);
        });

        it.each(["aptos", "bitcoin", "", "EVM", "toString", "constructor"])(
            "returns false for unsupported chain type %o",
            (chainType) => {
                expect(isSupportedChainType(chainType)).toBe(false);
            }
        );
    });

    describe("extractAddSignerOperation", () => {
        const signer = { locator: "me:evm:smart", type: "api-key" };

        it.each(["solana", "stellar"] as const)("%s maps transaction to transaction operation", (chain) => {
            expect(
                getChainAdapter(chain).extractAddSignerOperation({ transaction: { id: "tx-1" } } as any, chain, signer)
            ).toEqual({ type: "transaction", id: "tx-1" });
        });

        it.each(["solana", "stellar"] as const)("%s throws when transaction missing", (chain) => {
            expect(() => getChainAdapter(chain).extractAddSignerOperation({} as any, chain, signer)).toThrow(
                "Expected transaction in response for Solana/Stellar chain"
            );
        });

        it("evm returns a pending signature operation from the chains map", () => {
            const response = { chains: { "base-sepolia": { id: "sig-1", status: "pending" } } } as any;
            expect(getChainAdapter("base-sepolia").extractAddSignerOperation(response, "base-sepolia", signer)).toEqual(
                { type: "signature", id: "sig-1" }
            );
        });

        it("evm returns null when the chain status is not pending", () => {
            const response = { chains: { "base-sepolia": { id: "sig-1", status: "success" } } } as any;
            expect(
                getChainAdapter("base-sepolia").extractAddSignerOperation(response, "base-sepolia", signer)
            ).toBeNull();
        });

        it("evm throws when chains missing", () => {
            expect(() =>
                getChainAdapter("base-sepolia").extractAddSignerOperation({} as any, "base-sepolia", signer)
            ).toThrow("Expected chains in response for EVM chain");
        });

        it("evm throws InvalidSignerError when chain status is failed", () => {
            const response = { chains: { "base-sepolia": { id: "sig-1", status: "failed" } } } as any;
            expect(() =>
                getChainAdapter("base-sepolia").extractAddSignerOperation(response, "base-sepolia", signer)
            ).toThrow(InvalidSignerError);
            expect(() =>
                getChainAdapter("base-sepolia").extractAddSignerOperation(response, "base-sepolia", signer)
            ).toThrow("Signer registration failed for chain base-sepolia (signer: me:evm:smart)");
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

describe("signApproval", () => {
    const V0_MESSAGE = base58.encode(
        new TransactionMessage({
            payerKey: Keypair.generate().publicKey,
            recentBlockhash: Keypair.generate().publicKey.toBase58(),
            instructions: [],
        })
            .compileToV0Message()
            .serialize()
    );
    const SERIALIZED_TRANSACTION = "SERIALIZED_TX";

    function makeSigner(type: string) {
        return {
            type,
            signMessage: vi.fn(async () => ({ signature: "from-signMessage" })),
            signTransaction: vi.fn(async () => ({ signature: "from-signTransaction" })),
        } as unknown as SignerAdapter & {
            signMessage: ReturnType<typeof vi.fn>;
            signTransaction: ReturnType<typeof vi.fn>;
        };
    }

    const transaction = { onChain: { transaction: SERIALIZED_TRANSACTION } } as never;

    describe("when the chain is solana and the signer is an external wallet", () => {
        test("signs the approval message directly for a version-1 transaction", async () => {
            const signer = makeSigner("external-wallet");

            await getChainAdapter("solana").signApproval(signer, transaction, VERSION_1_MESSAGE);

            expect(signer.signMessage).toHaveBeenCalledWith(VERSION_1_MESSAGE);
            expect(signer.signTransaction).not.toHaveBeenCalled();
        });

        test("sends the serialized transaction to the adapter for a version-0 transaction", async () => {
            const signer = makeSigner("external-wallet");

            await getChainAdapter("solana").signApproval(signer, transaction, V0_MESSAGE);

            expect(signer.signTransaction).toHaveBeenCalledWith(SERIALIZED_TRANSACTION);
            expect(signer.signMessage).not.toHaveBeenCalled();
        });

        test("falls back to the approval message when the API supplies no transaction", async () => {
            const signer = makeSigner("external-wallet");

            await getChainAdapter("solana").signApproval(signer, { onChain: {} } as never, V0_MESSAGE);

            expect(signer.signTransaction).toHaveBeenCalledWith(V0_MESSAGE);
        });
    });

    describe("when the chain is solana and the signer holds the key", () => {
        test("signs the approval message even for a version-1 transaction", async () => {
            const signer = makeSigner("email");

            await getChainAdapter("solana").signApproval(signer, transaction, VERSION_1_MESSAGE);

            expect(signer.signTransaction).toHaveBeenCalledWith(VERSION_1_MESSAGE);
            expect(signer.signMessage).not.toHaveBeenCalled();
        });
    });

    describe("when the chain is not solana", () => {
        test.each(["base-sepolia", "stellar"] as const)("%s signs the approval message", async (chain) => {
            const signer = makeSigner("external-wallet");

            await getChainAdapter(chain).signApproval(signer, transaction, VERSION_1_MESSAGE);

            expect(signer.signTransaction).toHaveBeenCalledWith(VERSION_1_MESSAGE);
            expect(signer.signMessage).not.toHaveBeenCalled();
        });
    });
});
