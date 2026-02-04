import { afterEach, beforeEach, describe, expect, it, vi, type MockedFunction } from "vitest";
import { WalletFactory } from "./wallet-factory";
import { WalletCreationError, InvalidEnvironmentError } from "../utils/errors";
import type { ApiClient, GetWalletSuccessResponse } from "../api";
import type { WalletArgsFor } from "./types";
import { APIKeyEnvironmentPrefix } from "@crossmint/common-sdk-base";

type MockedApiClient = {
    isServerSide: boolean;
    crossmint: { projectId: string };
    environment: string;
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
            environment: APIKeyEnvironmentPrefix.STAGING,
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
                    `2 delegated signer(s) specified, but wallet "9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM" has no delegated signers. When 'delegatedSigners' is provided to a method that may fetch an existing wallet, each specified delegated signer must exist in that wallet's configuration.`
                )
            );
        });

        it("should allow subset of delegated signers (wallet can have more than specified)", async () => {
            // Mock getWallet to return wallet with delegated signers
            mockApiClient.getWallet.mockResolvedValue(mockWalletWithDelegatedSigners);

            const argsWithFewerSigners: WalletArgsFor<"solana"> = {
                chain: "solana",
                signer: {
                    type: "external-wallet",
                    address: "AdminSignerAddress123",
                },
                delegatedSigners: [
                    // Only providing 1 signer when wallet has 2 - this should now be allowed
                    { signer: "external-wallet:EbXL4e6XgbcC7s33cD5EZtyn5nixRDsieBjPQB7zf448" },
                ],
            };

            // This should not throw an error since the specified signer exists in the wallet
            await expect(walletFactory.getOrCreateWallet(argsWithFewerSigners)).resolves.toBeDefined();
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
                    `Delegated signer 'external-wallet:NonExistentSignerAddress123' does not exist in wallet "9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM". Available delegated signers: external-wallet:EbXL4e6XgbcC7s33cD5EZtyn5nixRDsieBjPQB7zf448, external-wallet:9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM. When 'delegatedSigners' is provided to a method that may fetch an existing wallet, each specified delegated signer must exist in that wallet's configuration.`
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

        it("should allow empty array when wallet has signers (no validation needed)", async () => {
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

            // This should not throw an error since no delegated signers were specified
            await expect(walletFactory.getOrCreateWallet(argsWithEmptyDelegatedSigners)).resolves.toBeDefined();
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

describe("WalletFactory - EVM Delegated Signers Validation", () => {
    let walletFactory: WalletFactory;
    let mockApiClient: MockedApiClient;

    // Mock EVM wallet response with delegated signers
    const mockEvmWalletWithDelegatedSigners = {
        chainType: "evm" as const,
        type: "smart" as const,
        address: "0x1234567890123456789012345678901234567890",
        owner: "test-owner",
        config: {
            adminSigner: {
                type: "external-wallet" as const,
                address: "0xAdminSignerAddress123456789012345678901234",
                locator: "external-wallet:0xAdminSignerAddress123456789012345678901234",
            },
            delegatedSigners: [
                {
                    type: "external-wallet" as const,
                    address: "0xEbXL4e6XgbcC7s33cD5EZtyn5nixRDsieBjPQB7z",
                    locator: "external-wallet:0xEbXL4e6XgbcC7s33cD5EZtyn5nixRDsieBjPQB7z",
                },
                {
                    type: "external-wallet" as const,
                    address: "0x9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYt",
                    locator: "external-wallet:0x9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYt",
                },
            ],
        },
        createdAt: Date.now(),
    } as GetWalletSuccessResponse;

    // Mock EVM wallet response without delegated signers
    const mockEvmWalletWithoutDelegatedSigners = {
        chainType: "evm" as const,
        type: "smart" as const,
        address: "0x1234567890123456789012345678901234567890",
        owner: "test-owner",
        config: {
            adminSigner: {
                type: "external-wallet" as const,
                address: "0xAdminSignerAddress123456789012345678901234",
                locator: "external-wallet:0xAdminSignerAddress123456789012345678901234",
            },
        },
        createdAt: Date.now(),
    } as GetWalletSuccessResponse;

    const mockValidEvmArgs: WalletArgsFor<"base-sepolia"> = {
        chain: "base-sepolia",
        signer: {
            type: "external-wallet",
            address: "0xAdminSignerAddress123456789012345678901234",
        },
        delegatedSigners: [
            { signer: "external-wallet:0xEbXL4e6XgbcC7s33cD5EZtyn5nixRDsieBjPQB7z" },
            { signer: "external-wallet:0x9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYt" },
        ],
    };

    beforeEach(() => {
        vi.resetAllMocks();

        mockApiClient = {
            isServerSide: false,
            crossmint: { projectId: "test-project" },
            environment: APIKeyEnvironmentPrefix.STAGING,
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
            mockApiClient.getWallet.mockResolvedValue(mockEvmWalletWithDelegatedSigners);

            await expect(walletFactory.getOrCreateWallet(mockValidEvmArgs)).resolves.toBeDefined();

            expect(mockApiClient.getWallet).toHaveBeenCalledWith("me:evm:smart");
        });
    });

    describe("Error Cases", () => {
        it("should throw error when delegated signers are provided but wallet has none", async () => {
            mockApiClient.getWallet.mockResolvedValue(mockEvmWalletWithoutDelegatedSigners);

            await expect(walletFactory.getOrCreateWallet(mockValidEvmArgs)).rejects.toThrow(
                new WalletCreationError(
                    `2 delegated signer(s) specified, but wallet "0x1234567890123456789012345678901234567890" has no delegated signers. When 'delegatedSigners' is provided to a method that may fetch an existing wallet, each specified delegated signer must exist in that wallet's configuration.`
                )
            );
        });

        it("should allow subset of delegated signers (wallet can have more than specified)", async () => {
            mockApiClient.getWallet.mockResolvedValue(mockEvmWalletWithDelegatedSigners);

            const argsWithFewerSigners: WalletArgsFor<"base-sepolia"> = {
                chain: "base-sepolia",
                signer: {
                    type: "external-wallet",
                    address: "0xAdminSignerAddress123456789012345678901234",
                },
                delegatedSigners: [{ signer: "external-wallet:0xEbXL4e6XgbcC7s33cD5EZtyn5nixRDsieBjPQB7z" }],
            };

            await expect(walletFactory.getOrCreateWallet(argsWithFewerSigners)).resolves.toBeDefined();
        });

        it("should throw error when a delegated signer is not found in existing wallet", async () => {
            mockApiClient.getWallet.mockResolvedValue(mockEvmWalletWithDelegatedSigners);

            const argsWithNonMatchingSigner: WalletArgsFor<"base-sepolia"> = {
                chain: "base-sepolia",
                signer: {
                    type: "external-wallet",
                    address: "0xAdminSignerAddress123456789012345678901234",
                },
                delegatedSigners: [
                    { signer: "external-wallet:0xEbXL4e6XgbcC7s33cD5EZtyn5nixRDsieBjPQB7z" },
                    { signer: "external-wallet:0xNonExistentSignerAddress123456789012345678" },
                ],
            };

            await expect(walletFactory.getOrCreateWallet(argsWithNonMatchingSigner)).rejects.toThrow(
                new WalletCreationError(
                    `Delegated signer 'external-wallet:0xNonExistentSignerAddress123456789012345678' does not exist in wallet "0x1234567890123456789012345678901234567890". Available delegated signers: external-wallet:0xEbXL4e6XgbcC7s33cD5EZtyn5nixRDsieBjPQB7z, external-wallet:0x9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYt. When 'delegatedSigners' is provided to a method that may fetch an existing wallet, each specified delegated signer must exist in that wallet's configuration.`
                )
            );
        });
    });

    describe("Edge Cases", () => {
        it("should handle empty delegated signers array in both args and wallet", async () => {
            const walletWithEmptyDelegatedSigners = {
                chainType: "evm" as const,
                type: "smart" as const,
                address: mockEvmWalletWithDelegatedSigners.address,
                owner: mockEvmWalletWithDelegatedSigners.owner,
                config: {
                    adminSigner: (mockEvmWalletWithDelegatedSigners.config as any)?.adminSigner,
                    delegatedSigners: [],
                },
                createdAt: mockEvmWalletWithDelegatedSigners.createdAt,
            } as GetWalletSuccessResponse;

            mockApiClient.getWallet.mockResolvedValue(walletWithEmptyDelegatedSigners);

            const argsWithEmptyDelegatedSigners: WalletArgsFor<"base-sepolia"> = {
                chain: "base-sepolia",
                signer: {
                    type: "external-wallet",
                    address: "0xAdminSignerAddress123456789012345678901234",
                },
                delegatedSigners: [],
            };

            await expect(walletFactory.getOrCreateWallet(argsWithEmptyDelegatedSigners)).resolves.toBeDefined();
        });

        it("should allow empty array when wallet has signers (no validation needed)", async () => {
            mockApiClient.getWallet.mockResolvedValue(mockEvmWalletWithDelegatedSigners);

            const argsWithEmptyDelegatedSigners: WalletArgsFor<"base-sepolia"> = {
                chain: "base-sepolia",
                signer: {
                    type: "external-wallet",
                    address: "0xAdminSignerAddress123456789012345678901234",
                },
                delegatedSigners: [],
            };

            await expect(walletFactory.getOrCreateWallet(argsWithEmptyDelegatedSigners)).resolves.toBeDefined();
        });

        it("should maintain order independence when comparing delegated signers", async () => {
            mockApiClient.getWallet.mockResolvedValue(mockEvmWalletWithDelegatedSigners);

            const argsWithDifferentOrder: WalletArgsFor<"base-sepolia"> = {
                chain: "base-sepolia",
                signer: {
                    type: "external-wallet",
                    address: "0xAdminSignerAddress123456789012345678901234",
                },
                delegatedSigners: [
                    { signer: "external-wallet:0x9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYt" },
                    { signer: "external-wallet:0xEbXL4e6XgbcC7s33cD5EZtyn5nixRDsieBjPQB7z" },
                ],
            };

            await expect(walletFactory.getOrCreateWallet(argsWithDifferentOrder)).resolves.toBeDefined();
        });
    });
});

describe("WalletFactory - Stellar Delegated Signers Validation", () => {
    let walletFactory: WalletFactory;
    let mockApiClient: MockedApiClient;

    // Mock Stellar wallet response with delegated signers
    const mockStellarWalletWithDelegatedSigners = {
        chainType: "stellar" as const,
        type: "smart" as const,
        address: "GCKFBEIYTKP6RCZX6LRQW2JVAVLMGGVSNESWKN7L2YGQNI2DCOHVHJVY",
        owner: "test-owner",
        config: {
            adminSigner: {
                type: "external-wallet" as const,
                address: "GADMINSGNERADDRESS123456789012345678901234567890123456",
                locator: "external-wallet:GADMINSGNERADDRESS123456789012345678901234567890123456",
            },
            delegatedSigners: [
                {
                    type: "external-wallet" as const,
                    address: "GEBXL4E6XGBCC7S33CD5EZTYN5NIXRDSIEBJPQB7ZF448ABCDEFGH",
                    locator: "external-wallet:GEBXL4E6XGBCC7S33CD5EZTYN5NIXRDSIEBJPQB7ZF448ABCDEFGH",
                },
                {
                    type: "external-wallet" as const,
                    address: "G9WZDXWBBMKG8ZTBNMQUXVQRAYRZZDSGYLDVL9ZYTAWWABCDEFGH",
                    locator: "external-wallet:G9WZDXWBBMKG8ZTBNMQUXVQRAYRZZDSGYLDVL9ZYTAWWABCDEFGH",
                },
            ],
        },
        createdAt: Date.now(),
    } as GetWalletSuccessResponse;

    // Mock Stellar wallet response without delegated signers
    const mockStellarWalletWithoutDelegatedSigners = {
        chainType: "stellar" as const,
        type: "smart" as const,
        address: "GCKFBEIYTKP6RCZX6LRQW2JVAVLMGGVSNESWKN7L2YGQNI2DCOHVHJVY",
        owner: "test-owner",
        config: {
            adminSigner: {
                type: "external-wallet" as const,
                address: "GADMINSGNERADDRESS123456789012345678901234567890123456",
                locator: "external-wallet:GADMINSGNERADDRESS123456789012345678901234567890123456",
            },
        },
        createdAt: Date.now(),
    } as GetWalletSuccessResponse;

    const mockValidStellarArgs: WalletArgsFor<"stellar"> = {
        chain: "stellar",
        signer: {
            type: "external-wallet",
            address: "GADMINSGNERADDRESS123456789012345678901234567890123456",
        },
        delegatedSigners: [
            { signer: "external-wallet:GEBXL4E6XGBCC7S33CD5EZTYN5NIXRDSIEBJPQB7ZF448ABCDEFGH" },
            { signer: "external-wallet:G9WZDXWBBMKG8ZTBNMQUXVQRAYRZZDSGYLDVL9ZYTAWWABCDEFGH" },
        ],
    };

    beforeEach(() => {
        vi.resetAllMocks();

        mockApiClient = {
            isServerSide: false,
            crossmint: { projectId: "test-project" },
            environment: APIKeyEnvironmentPrefix.STAGING,
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
            mockApiClient.getWallet.mockResolvedValue(mockStellarWalletWithDelegatedSigners);

            await expect(walletFactory.getOrCreateWallet(mockValidStellarArgs)).resolves.toBeDefined();

            expect(mockApiClient.getWallet).toHaveBeenCalledWith("me:stellar:smart");
        });
    });

    describe("Error Cases", () => {
        it("should throw error when delegated signers are provided but wallet has none", async () => {
            mockApiClient.getWallet.mockResolvedValue(mockStellarWalletWithoutDelegatedSigners);

            await expect(walletFactory.getOrCreateWallet(mockValidStellarArgs)).rejects.toThrow(
                new WalletCreationError(
                    `2 delegated signer(s) specified, but wallet "GCKFBEIYTKP6RCZX6LRQW2JVAVLMGGVSNESWKN7L2YGQNI2DCOHVHJVY" has no delegated signers. When 'delegatedSigners' is provided to a method that may fetch an existing wallet, each specified delegated signer must exist in that wallet's configuration.`
                )
            );
        });

        it("should allow subset of delegated signers (wallet can have more than specified)", async () => {
            mockApiClient.getWallet.mockResolvedValue(mockStellarWalletWithDelegatedSigners);

            const argsWithFewerSigners: WalletArgsFor<"stellar"> = {
                chain: "stellar",
                signer: {
                    type: "external-wallet",
                    address: "GADMINSGNERADDRESS123456789012345678901234567890123456",
                },
                delegatedSigners: [{ signer: "external-wallet:GEBXL4E6XGBCC7S33CD5EZTYN5NIXRDSIEBJPQB7ZF448ABCDEFGH" }],
            };

            await expect(walletFactory.getOrCreateWallet(argsWithFewerSigners)).resolves.toBeDefined();
        });

        it("should throw error when a delegated signer is not found in existing wallet", async () => {
            mockApiClient.getWallet.mockResolvedValue(mockStellarWalletWithDelegatedSigners);

            const argsWithNonMatchingSigner: WalletArgsFor<"stellar"> = {
                chain: "stellar",
                signer: {
                    type: "external-wallet",
                    address: "GADMINSGNERADDRESS123456789012345678901234567890123456",
                },
                delegatedSigners: [
                    { signer: "external-wallet:GEBXL4E6XGBCC7S33CD5EZTYN5NIXRDSIEBJPQB7ZF448ABCDEFGH" },
                    { signer: "external-wallet:GNONEXISTENTSIGNERADDRESS123456789012345678901234567890" },
                ],
            };

            await expect(walletFactory.getOrCreateWallet(argsWithNonMatchingSigner)).rejects.toThrow(
                new WalletCreationError(
                    `Delegated signer 'external-wallet:GNONEXISTENTSIGNERADDRESS123456789012345678901234567890' does not exist in wallet "GCKFBEIYTKP6RCZX6LRQW2JVAVLMGGVSNESWKN7L2YGQNI2DCOHVHJVY". Available delegated signers: external-wallet:GEBXL4E6XGBCC7S33CD5EZTYN5NIXRDSIEBJPQB7ZF448ABCDEFGH, external-wallet:G9WZDXWBBMKG8ZTBNMQUXVQRAYRZZDSGYLDVL9ZYTAWWABCDEFGH. When 'delegatedSigners' is provided to a method that may fetch an existing wallet, each specified delegated signer must exist in that wallet's configuration.`
                )
            );
        });
    });

    describe("Edge Cases", () => {
        it("should handle empty delegated signers array in both args and wallet", async () => {
            const walletWithEmptyDelegatedSigners = {
                chainType: "stellar" as const,
                type: "smart" as const,
                address: mockStellarWalletWithDelegatedSigners.address,
                owner: mockStellarWalletWithDelegatedSigners.owner,
                config: {
                    adminSigner: (mockStellarWalletWithDelegatedSigners.config as any)?.adminSigner,
                    delegatedSigners: [],
                },
                createdAt: mockStellarWalletWithDelegatedSigners.createdAt,
            } as GetWalletSuccessResponse;

            mockApiClient.getWallet.mockResolvedValue(walletWithEmptyDelegatedSigners);

            const argsWithEmptyDelegatedSigners: WalletArgsFor<"stellar"> = {
                chain: "stellar",
                signer: {
                    type: "external-wallet",
                    address: "GADMINSGNERADDRESS123456789012345678901234567890123456",
                },
                delegatedSigners: [],
            };

            await expect(walletFactory.getOrCreateWallet(argsWithEmptyDelegatedSigners)).resolves.toBeDefined();
        });

        it("should allow empty array when wallet has signers (no validation needed)", async () => {
            mockApiClient.getWallet.mockResolvedValue(mockStellarWalletWithDelegatedSigners);

            const argsWithEmptyDelegatedSigners: WalletArgsFor<"stellar"> = {
                chain: "stellar",
                signer: {
                    type: "external-wallet",
                    address: "GADMINSGNERADDRESS123456789012345678901234567890123456",
                },
                delegatedSigners: [],
            };

            await expect(walletFactory.getOrCreateWallet(argsWithEmptyDelegatedSigners)).resolves.toBeDefined();
        });

        it("should maintain order independence when comparing delegated signers", async () => {
            mockApiClient.getWallet.mockResolvedValue(mockStellarWalletWithDelegatedSigners);

            const argsWithDifferentOrder: WalletArgsFor<"stellar"> = {
                chain: "stellar",
                signer: {
                    type: "external-wallet",
                    address: "GADMINSGNERADDRESS123456789012345678901234567890123456",
                },
                delegatedSigners: [
                    { signer: "external-wallet:G9WZDXWBBMKG8ZTBNMQUXVQRAYRZZDSGYLDVL9ZYTAWWABCDEFGH" },
                    { signer: "external-wallet:GEBXL4E6XGBCC7S33CD5EZTYN5NIXRDSIEBJPQB7ZF448ABCDEFGH" },
                ],
            };

            await expect(walletFactory.getOrCreateWallet(argsWithDifferentOrder)).resolves.toBeDefined();
        });
    });
});

describe("WalletFactory - Chain Environment Validation", () => {
    let walletFactory: WalletFactory;
    let mockApiClient: MockedApiClient;

    const mockEvmWallet = {
        chainType: "evm" as const,
        type: "smart" as const,
        address: "0x1234567890123456789012345678901234567890",
        owner: "test-owner",
        config: {
            adminSigner: {
                type: "external-wallet" as const,
                address: "0xAdminSignerAddress123456789012345678901234",
                locator: "external-wallet:0xAdminSignerAddress123456789012345678901234",
            },
        },
        createdAt: Date.now(),
    } as GetWalletSuccessResponse;

    beforeEach(() => {
        vi.resetAllMocks();
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    describe("Production Environment", () => {
        beforeEach(() => {
            mockApiClient = {
                isServerSide: false,
                crossmint: { projectId: "test-project" },
                environment: APIKeyEnvironmentPrefix.PRODUCTION,
                getWallet: vi.fn(),
                createWallet: vi.fn(),
            };
            walletFactory = new WalletFactory(mockApiClient as unknown as ApiClient);
        });

        it("should allow mainnet chain in production environment", async () => {
            mockApiClient.getWallet.mockResolvedValue(mockEvmWallet);

            const mainnetArgs: WalletArgsFor<"base"> = {
                chain: "base",
                signer: {
                    type: "external-wallet",
                    address: "0xAdminSignerAddress123456789012345678901234",
                },
            };

            await expect(walletFactory.getOrCreateWallet(mainnetArgs)).resolves.toBeDefined();
        });

        it("should throw error when using testnet chain in production environment", async () => {
            const testnetArgs: WalletArgsFor<"base-sepolia"> = {
                chain: "base-sepolia",
                signer: {
                    type: "external-wallet",
                    address: "0xAdminSignerAddress123456789012345678901234",
                },
            };

            await expect(walletFactory.getOrCreateWallet(testnetArgs)).rejects.toThrow(InvalidEnvironmentError);
            await expect(walletFactory.getOrCreateWallet(testnetArgs)).rejects.toThrow(
                'Chain "base-sepolia" is a testnet chain and cannot be used in production environment. Please use a mainnet chain instead.'
            );
        });

        it("should allow solana chain in production environment (no validation)", async () => {
            const solanaWallet = {
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

            mockApiClient.getWallet.mockResolvedValue(solanaWallet);

            const solanaArgs: WalletArgsFor<"solana"> = {
                chain: "solana",
                signer: {
                    type: "external-wallet",
                    address: "AdminSignerAddress123",
                },
            };

            await expect(walletFactory.getOrCreateWallet(solanaArgs)).resolves.toBeDefined();
        });

        it("should allow stellar chain in production environment (no validation)", async () => {
            const stellarWallet = {
                chainType: "stellar" as const,
                type: "smart" as const,
                address: "GCKFBEIYTKP6RCZX6LRQW2JVAVLMGGVSNESWKN7L2YGQNI2DCOHVHJVY",
                owner: "test-owner",
                config: {
                    adminSigner: {
                        type: "external-wallet" as const,
                        address: "GADMINSGNERADDRESS123456789012345678901234567890123456",
                        locator: "external-wallet:GADMINSGNERADDRESS123456789012345678901234567890123456",
                    },
                },
                createdAt: Date.now(),
            } as GetWalletSuccessResponse;

            mockApiClient.getWallet.mockResolvedValue(stellarWallet);

            const stellarArgs: WalletArgsFor<"stellar"> = {
                chain: "stellar",
                signer: {
                    type: "external-wallet",
                    address: "GADMINSGNERADDRESS123456789012345678901234567890123456",
                },
            };

            await expect(walletFactory.getOrCreateWallet(stellarArgs)).resolves.toBeDefined();
        });
    });

    describe("Staging Environment", () => {
        beforeEach(() => {
            mockApiClient = {
                isServerSide: false,
                crossmint: { projectId: "test-project" },
                environment: APIKeyEnvironmentPrefix.STAGING,
                getWallet: vi.fn(),
                createWallet: vi.fn(),
            };
            walletFactory = new WalletFactory(mockApiClient as unknown as ApiClient);
        });

        it("should allow testnet chain in staging environment", async () => {
            mockApiClient.getWallet.mockResolvedValue(mockEvmWallet);

            const testnetArgs: WalletArgsFor<"base-sepolia"> = {
                chain: "base-sepolia",
                signer: {
                    type: "external-wallet",
                    address: "0xAdminSignerAddress123456789012345678901234",
                },
            };

            await expect(walletFactory.getOrCreateWallet(testnetArgs)).resolves.toBeDefined();
        });

        it("should throw error when using mainnet chain in staging environment", async () => {
            const mainnetArgs: WalletArgsFor<"base"> = {
                chain: "base",
                signer: {
                    type: "external-wallet",
                    address: "0xAdminSignerAddress123456789012345678901234",
                },
            };

            await expect(walletFactory.getOrCreateWallet(mainnetArgs)).rejects.toThrow(InvalidEnvironmentError);
            await expect(walletFactory.getOrCreateWallet(mainnetArgs)).rejects.toThrow(
                'Chain "base" is a mainnet chain and cannot be used in staging environment. Please use a testnet chain instead.'
            );
        });
    });

    describe("Development Environment", () => {
        beforeEach(() => {
            mockApiClient = {
                isServerSide: false,
                crossmint: { projectId: "test-project" },
                environment: APIKeyEnvironmentPrefix.DEVELOPMENT,
                getWallet: vi.fn(),
                createWallet: vi.fn(),
            };
            walletFactory = new WalletFactory(mockApiClient as unknown as ApiClient);
        });

        it("should allow testnet chain in development environment", async () => {
            mockApiClient.getWallet.mockResolvedValue(mockEvmWallet);

            const testnetArgs: WalletArgsFor<"polygon-amoy"> = {
                chain: "polygon-amoy",
                signer: {
                    type: "external-wallet",
                    address: "0xAdminSignerAddress123456789012345678901234",
                },
            };

            await expect(walletFactory.getOrCreateWallet(testnetArgs)).resolves.toBeDefined();
        });

        it("should throw error when using mainnet chain in development environment", async () => {
            const mainnetArgs: WalletArgsFor<"polygon"> = {
                chain: "polygon",
                signer: {
                    type: "external-wallet",
                    address: "0xAdminSignerAddress123456789012345678901234",
                },
            };

            await expect(walletFactory.getOrCreateWallet(mainnetArgs)).rejects.toThrow(InvalidEnvironmentError);
            await expect(walletFactory.getOrCreateWallet(mainnetArgs)).rejects.toThrow(
                'Chain "polygon" is a mainnet chain and cannot be used in development environment. Please use a testnet chain instead.'
            );
        });
    });

    describe("Server-side getWallet", () => {
        beforeEach(() => {
            mockApiClient = {
                isServerSide: true,
                crossmint: { projectId: "test-project" },
                environment: APIKeyEnvironmentPrefix.PRODUCTION,
                getWallet: vi.fn(),
                createWallet: vi.fn(),
            };
            walletFactory = new WalletFactory(mockApiClient as unknown as ApiClient);
        });

        it("should throw error when using testnet chain in production with getWallet", async () => {
            const testnetArgs: WalletArgsFor<"base-sepolia"> = {
                chain: "base-sepolia",
                signer: {
                    type: "external-wallet",
                    address: "0xAdminSignerAddress123456789012345678901234",
                },
            };

            await expect(walletFactory.getWallet("wallet-locator", testnetArgs)).rejects.toThrow(
                InvalidEnvironmentError
            );
        });

        it("should allow mainnet chain in production with getWallet", async () => {
            mockApiClient.getWallet.mockResolvedValue(mockEvmWallet);

            const mainnetArgs: WalletArgsFor<"base"> = {
                chain: "base",
                signer: {
                    type: "external-wallet",
                    address: "0xAdminSignerAddress123456789012345678901234",
                },
            };

            await expect(walletFactory.getWallet("wallet-locator", mainnetArgs)).resolves.toBeDefined();
        });
    });

    describe("createWallet", () => {
        beforeEach(() => {
            mockApiClient = {
                isServerSide: false,
                crossmint: { projectId: "test-project" },
                environment: APIKeyEnvironmentPrefix.PRODUCTION,
                getWallet: vi.fn(),
                createWallet: vi.fn(),
            };
            walletFactory = new WalletFactory(mockApiClient as unknown as ApiClient);
        });

        it("should throw error when using testnet chain in production with createWallet", async () => {
            const testnetArgs: WalletArgsFor<"base-sepolia"> = {
                chain: "base-sepolia",
                signer: {
                    type: "external-wallet",
                    address: "0xAdminSignerAddress123456789012345678901234",
                },
            };

            await expect(walletFactory.createWallet(testnetArgs)).rejects.toThrow(InvalidEnvironmentError);
        });
    });
});
