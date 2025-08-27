import { afterEach, beforeEach, describe, expect, it, vi, type MockedFunction } from "vitest";
import { WalletFactory } from "./wallet-factory";
import { WalletCreationError } from "../utils/errors";
import type { ApiClient, GetWalletSuccessResponse } from "../api";
import type { WalletArgsFor } from "./types";

type MockedApiClient = {
    isServerSide: boolean;
    crossmint: { projectId: string };
    getWallet: MockedFunction<ApiClient["getWallet"]>;
    createWallet: MockedFunction<ApiClient["createWallet"]>;
};

describe("WalletFactory - Delegated Signers Validation", () => {
    let walletFactory: WalletFactory;
    let mockApiClient: MockedApiClient;

    // Mock wallet response with delegated signers
    const mockWalletWithDelegatedSigners = {
        chainType: "solana" as const,
        type: "smart" as const,
        address: "9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM",
        owner: "test-owner",
        config: {
            adminSigner: {
                type: "external-wallet" as const,
                address: "AdminSignerAddress123",
                locator: "external-wallet:AdminSignerAddress123",
            },
            delegatedSigners: [
                {
                    type: "external-wallet" as const,
                    address: "EbXL4e6XgbcC7s33cD5EZtyn5nixRDsieBjPQB7zf448",
                    locator: "external-wallet:EbXL4e6XgbcC7s33cD5EZtyn5nixRDsieBjPQB7zf448",
                },
                {
                    type: "external-wallet" as const,
                    address: "9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM",
                    locator: "external-wallet:9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM",
                },
            ],
        },
        createdAt: Date.now(),
    } as GetWalletSuccessResponse;

    // Mock wallet response without delegated signers
    const mockWalletWithoutDelegatedSigners = {
        chainType: "solana" as const,
        type: "smart" as const,
        address: "9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM",
        owner: "test-owner",
        config: {
            adminSigner: {
                type: "external-wallet" as const,
                address: "AdminSignerAddress123",
                locator: "external-wallet:AdminSignerAddress123",
            },
        },
        createdAt: Date.now(),
    } as GetWalletSuccessResponse;

    const mockValidSolanaArgs: WalletArgsFor<"solana"> = {
        chain: "solana",
        signer: {
            type: "external-wallet",
            address: "AdminSignerAddress123",
        },
        delegatedSigners: [
            { signer: "external-wallet:EbXL4e6XgbcC7s33cD5EZtyn5nixRDsieBjPQB7zf448" },
            { signer: "external-wallet:9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM" },
        ],
    };

    beforeEach(() => {
        vi.resetAllMocks();

        mockApiClient = {
            isServerSide: false,
            crossmint: { projectId: "test-project" },
            getWallet: vi.fn(),
            createWallet: vi.fn(),
        };

        walletFactory = new WalletFactory(mockApiClient as unknown as ApiClient);
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    describe("Happy Path", () => {
        it("should successfully validate matching delegated signers", async () => {
            // Mock getWallet to return existing wallet with delegated signers
            mockApiClient.getWallet.mockResolvedValue(mockWalletWithDelegatedSigners);

            // This should not throw an error
            await expect(walletFactory.getOrCreateWallet(mockValidSolanaArgs)).resolves.toBeDefined();

            expect(mockApiClient.getWallet).toHaveBeenCalledWith("me:solana:smart");
        });
    });

    describe("Error Cases", () => {
        it("should throw error when delegated signers are provided but wallet has none", async () => {
            // Mock getWallet to return wallet without delegated signers
            mockApiClient.getWallet.mockResolvedValue(mockWalletWithoutDelegatedSigners);

            await expect(walletFactory.getOrCreateWallet(mockValidSolanaArgs)).rejects.toThrow(
                new WalletCreationError(
                    `2 delegated signer(s) specified, but wallet "9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM" has no delegated signers.\nWhen 'delegatedSigners' is provided to a method that fetches an existing wallet, that wallet must have matching delegated signers.`
                )
            );
        });

        it("should throw error when number of delegated signers does not match", async () => {
            // Mock getWallet to return wallet with delegated signers
            mockApiClient.getWallet.mockResolvedValue(mockWalletWithDelegatedSigners);

            const argsWithFewerSigners: WalletArgsFor<"solana"> = {
                chain: "solana",
                signer: {
                    type: "external-wallet",
                    address: "AdminSignerAddress123",
                },
                delegatedSigners: [
                    // Only providing 1 signer when wallet has 2
                    { signer: "external-wallet:EbXL4e6XgbcC7s33cD5EZtyn5nixRDsieBjPQB7zf448" },
                ],
            };

            await expect(walletFactory.getOrCreateWallet(argsWithFewerSigners)).rejects.toThrow(
                new WalletCreationError(
                    `1 delegated signer(s) specified, but wallet "9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM" has 2 delegated signers.\nWhen 'delegatedSigners' is provided to a method that fetches an existing wallet, that wallet must have matching delegated signers.`
                )
            );
        });

        it("should throw error when number of delegated signers does not match (more provided)", async () => {
            // Mock getWallet to return wallet with delegated signers
            mockApiClient.getWallet.mockResolvedValue(mockWalletWithDelegatedSigners);

            const argsWithMoreSigners: WalletArgsFor<"solana"> = {
                chain: "solana",
                signer: {
                    type: "external-wallet",
                    address: "AdminSignerAddress123",
                },
                delegatedSigners: [
                    { signer: "external-wallet:EbXL4e6XgbcC7s33cD5EZtyn5nixRDsieBjPQB7zf448" },
                    { signer: "external-wallet:9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM" },
                    { signer: "external-wallet:ExtraSignerAddress123" }, // Extra signer
                ],
            };

            await expect(walletFactory.getOrCreateWallet(argsWithMoreSigners)).rejects.toThrow(
                new WalletCreationError(
                    `3 delegated signer(s) specified, but wallet "9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM" has 2 delegated signers.\nWhen 'delegatedSigners' is provided to a method that fetches an existing wallet, that wallet must have matching delegated signers.`
                )
            );
        });

        it("should throw error when a delegated signer is not found in existing wallet", async () => {
            // Mock getWallet to return wallet with delegated signers
            mockApiClient.getWallet.mockResolvedValue(mockWalletWithDelegatedSigners);

            const argsWithNonMatchingSigner: WalletArgsFor<"solana"> = {
                chain: "solana",
                signer: {
                    type: "external-wallet",
                    address: "AdminSignerAddress123",
                },
                delegatedSigners: [
                    { signer: "external-wallet:EbXL4e6XgbcC7s33cD5EZtyn5nixRDsieBjPQB7zf448" }, // This exists
                    { signer: "external-wallet:NonExistentSignerAddress123" }, // This doesn't exist
                ],
            };

            await expect(walletFactory.getOrCreateWallet(argsWithNonMatchingSigner)).rejects.toThrow(
                new WalletCreationError(
                    `Delegated signer 'external-wallet:NonExistentSignerAddress123' is not valid for wallet "9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM". This wallet's delegated signers are: external-wallet:EbXL4e6XgbcC7s33cD5EZtyn5nixRDsieBjPQB7zf448, external-wallet:9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM.\nWhen 'delegatedSigners' is provided to a method that fetches an existing wallet, that wallet must have matching delegated signers.`
                )
            );
        });
    });

    describe("Edge Cases", () => {
        it("should handle empty delegated signers array in both args and wallet", async () => {
            // Mock wallet with empty delegated signers array
            const walletWithEmptyDelegatedSigners = {
                chainType: "solana" as const,
                type: "smart" as const,
                address: mockWalletWithDelegatedSigners.address,
                owner: mockWalletWithDelegatedSigners.owner,
                config: {
                    adminSigner: (mockWalletWithDelegatedSigners.config as any)?.adminSigner,
                    delegatedSigners: [],
                },
                createdAt: mockWalletWithDelegatedSigners.createdAt,
            } as GetWalletSuccessResponse;

            mockApiClient.getWallet.mockResolvedValue(walletWithEmptyDelegatedSigners);

            const argsWithEmptyDelegatedSigners: WalletArgsFor<"solana"> = {
                chain: "solana",
                signer: {
                    type: "external-wallet",
                    address: "AdminSignerAddress123",
                },
                delegatedSigners: [], // Empty array
            };

            // This should not throw an error (both are empty)
            await expect(walletFactory.getOrCreateWallet(argsWithEmptyDelegatedSigners)).resolves.toBeDefined();
        });

        it("should throw error when args has empty array but wallet has signers", async () => {
            // Mock getWallet to return wallet with delegated signers
            mockApiClient.getWallet.mockResolvedValue(mockWalletWithDelegatedSigners);

            const argsWithEmptyDelegatedSigners: WalletArgsFor<"solana"> = {
                chain: "solana",
                signer: {
                    type: "external-wallet",
                    address: "AdminSignerAddress123",
                },
                delegatedSigners: [], // Empty array
            };

            await expect(walletFactory.getOrCreateWallet(argsWithEmptyDelegatedSigners)).rejects.toThrow(
                new WalletCreationError(
                    `0 delegated signer(s) specified, but wallet "9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM" has 2 delegated signers.\nWhen 'delegatedSigners' is provided to a method that fetches an existing wallet, that wallet must have matching delegated signers.`
                )
            );
        });

        it("should maintain order independence when comparing delegated signers", async () => {
            // Mock getWallet to return wallet with delegated signers
            mockApiClient.getWallet.mockResolvedValue(mockWalletWithDelegatedSigners);

            // Provide delegated signers in different order
            const argsWithDifferentOrder: WalletArgsFor<"solana"> = {
                chain: "solana",
                signer: {
                    type: "external-wallet",
                    address: "AdminSignerAddress123",
                },
                delegatedSigners: [
                    // Reversed order from wallet response
                    { signer: "external-wallet:9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM" },
                    { signer: "external-wallet:EbXL4e6XgbcC7s33cD5EZtyn5nixRDsieBjPQB7zf448" },
                ],
            };

            // This should not throw an error (order shouldn't matter, only presence)
            await expect(walletFactory.getOrCreateWallet(argsWithDifferentOrder)).resolves.toBeDefined();
        });
    });
});
