import { describe, expect, it } from "vitest";
import type { Signer as APISigner } from "../api";
import { getPendingSignerOperation, isSignerOnChain, mapApiSignerToSigner } from "./signer-mapping";
import { createQuorumApiEntry } from "../wallets/__tests__/test-helpers";

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

describe("mapApiSignerToSigner", () => {
    describe("when the signer is a quorum", () => {
        it.each([
            {
                chain: "base-sepolia",
                statusFields: { chains: { "base-sepolia": { id: "tx-1", status: "awaiting-approval" } } },
                status: "awaiting-approval",
            },
            {
                chain: "base-sepolia",
                statusFields: { chains: { "base-sepolia": { status: "active" } } },
                status: "active",
            },
            { chain: "stellar", statusFields: { transaction: { id: "tx-1", status: "pending" } }, status: "pending" },
            { chain: "solana", statusFields: { transaction: { id: "tx-1", status: "pending" } }, status: "pending" },
            { chain: "solana", statusFields: {}, status: "success" },
        ] as const)("maps it on $chain with status $status", ({ chain, statusFields, status }) => {
            const quorum = createQuorumApiEntry();

            expect(mapApiSignerToSigner({ ...quorum, ...statusFields } as unknown as APISigner, chain)).toEqual({
                ...quorum,
                status,
            });
        });

        it.each([
            ["without the quorum: prefix", "quorum-x"],
            ["with an id that is not a UUID", "quorum:not-a-uuid"],
            ["with a version-8 UUID", "quorum:0b3e8f4c-6a1d-8c2e-9f3a-7d5b1e2c4a6f"],
            ["with an uppercase UUID", "quorum:0B3E8F4C-6A1D-4C2E-9F3A-7D5B1E2C4A6F"],
        ])("rejects a quorum locator %s", (_name, locator) => {
            const apiSigner = { ...createQuorumApiEntry(), locator, chains: {} } as unknown as APISigner;

            expect(() => mapApiSignerToSigner(apiSigner, "base-sepolia")).toThrow(/Malformed quorum locator/);
        });

        it.each([
            ["installed only on another chain", { chains: { "polygon-amoy": { id: "tx-1", status: "success" } } }],
            ["removed on every chain", { chains: {} }],
        ])("returns null for an EVM quorum %s", (_name, statusFields) => {
            const apiSigner = { ...createQuorumApiEntry(), ...statusFields } as unknown as APISigner;

            expect(mapApiSignerToSigner(apiSigner, "base-sepolia")).toBeNull();
        });
    });
});

describe("isSignerOnChain", () => {
    const signer = { type: "external-wallet", address: "0x123", locator: "external-wallet:0x123" };

    it.each([
        {
            name: "an EVM signer that lists this chain",
            listed: { ...signer, chains: { "base-sepolia": {} } },
            chain: "base-sepolia",
            expected: true,
        },
        {
            name: "an EVM signer that lists other chains only",
            listed: { ...signer, chains: { polygon: {} } },
            chain: "base-sepolia",
            expected: false,
        },
        {
            name: "an EVM signer created with the wallet (no chains)",
            listed: signer,
            chain: "base-sepolia",
            expected: true,
        },
        {
            name: "an EVM signer with an empty chains map",
            listed: { ...signer, chains: {} },
            chain: "base-sepolia",
            expected: true,
        },
        { name: "a Stellar signer", listed: { ...signer, chains: { polygon: {} } }, chain: "stellar", expected: true },
        {
            name: "an EVM quorum removed on every chain",
            listed: { ...signer, type: "quorum", locator: "quorum:0d3b3f6c-2c2a-4f43-9a2e-4b6a3c5d7e8f", chains: {} },
            chain: "base-sepolia",
            expected: false,
        },
    ] as const)("is $expected for $name", ({ listed, chain, expected }) => {
        expect(isSignerOnChain(listed, chain)).toBe(expected);
    });
});
