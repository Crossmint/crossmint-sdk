import { describe, expect, it } from "vitest";
import type { Signer as APISigner } from "../api";
import { getPendingSignerOperation } from "./signer-mapping";

describe("getPendingSignerOperation", () => {
    describe("EVM chains", () => {
        it("returns the signature operation for awaiting approval signers", () => {
            const apiSigner = {
                type: "email",
                email: "test@example.com",
                address: "0x123",
                locator: "email:test@example.com",
                chains: {
                    "base-sepolia": {
                        id: "sig-123",
                        status: "awaiting-approval",
                    },
                },
            } as unknown as APISigner;

            expect(getPendingSignerOperation(apiSigner, "base-sepolia")).toEqual({
                type: "signature",
                id: "sig-123",
            });
        });

        it("returns a transaction operation for EVM deployImmediately chain entries", () => {
            const apiSigner = {
                type: "external-wallet",
                address: "0x123",
                locator: "external-wallet:0x123",
                chains: {
                    "base-sepolia": {
                        id: "tx-456",
                        status: "awaiting-approval",
                        onChain: { userOperation: "0xabc", userOperationHash: "0xdef" },
                        chainType: "evm",
                        walletType: "smart",
                    },
                },
            } as unknown as APISigner;

            expect(getPendingSignerOperation(apiSigner, "base-sepolia")).toEqual({
                type: "transaction",
                id: "tx-456",
            });
        });

        it("returns null for failed signer registrations", () => {
            const apiSigner = {
                type: "email",
                email: "test@example.com",
                address: "0x123",
                locator: "email:test@example.com",
                chains: {
                    "base-sepolia": {
                        id: "sig-123",
                        status: "failed",
                    },
                },
            } as unknown as APISigner;

            expect(getPendingSignerOperation(apiSigner, "base-sepolia")).toBeNull();
        });
    });

    describe("Solana/Stellar chains", () => {
        it("returns the transaction operation for pending signer registrations", () => {
            const apiSigner = {
                type: "device",
                locator: "device:test-device",
                publicKey: { x: "1", y: "2" },
                transaction: {
                    id: "tx-123",
                    status: "pending",
                },
            } as unknown as APISigner;

            expect(getPendingSignerOperation(apiSigner, "solana")).toEqual({
                type: "transaction",
                id: "tx-123",
            });
        });

        it("returns null for failed signer registration transactions", () => {
            const apiSigner = {
                type: "device",
                locator: "device:test-device",
                publicKey: { x: "1", y: "2" },
                transaction: {
                    id: "tx-123",
                    status: "failed",
                },
            } as unknown as APISigner;

            expect(getPendingSignerOperation(apiSigner, "stellar")).toBeNull();
        });
    });
});
