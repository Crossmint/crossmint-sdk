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

describe("WalletFactory - OnCreateConfig Support", () => {
    let walletFactory: WalletFactory;
    let mockApiClient: MockedApiClient;

    const mockWalletWithAdminAndDelegated = {
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
                    address: "DelegatedSignerAddress456",
                    locator: "external-wallet:DelegatedSignerAddress456",
                },
            ],
        },
        createdAt: Date.now(),
    } as GetWalletSuccessResponse;

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

    describe("getOrCreateWallet with onCreateConfig", () => {
        it("should create wallet with onCreateConfig admin signer when wallet does not exist", async () => {
            mockApiClient.getWallet.mockResolvedValue({ error: "not found" });
            mockApiClient.createWallet.mockResolvedValue(mockWalletWithAdminAndDelegated);

            const args: WalletArgsFor<"solana"> = {
                chain: "solana",
                signer: {
                    type: "external-wallet",
                    address: "DelegatedSignerAddress456",
                },
                onCreateConfig: {
                    adminSigner: {
                        type: "external-wallet",
                        address: "AdminSignerAddress123",
                    },
                    delegatedSigners: [{ signer: "external-wallet:DelegatedSignerAddress456" }],
                },
            };

            await walletFactory.getOrCreateWallet(args);

            expect(mockApiClient.createWallet).toHaveBeenCalledWith(
                expect.objectContaining({
                    config: expect.objectContaining({
                        adminSigner: expect.objectContaining({
                            type: "external-wallet",
                            address: "AdminSignerAddress123",
                        }),
                        delegatedSigners: [{ signer: "external-wallet:DelegatedSignerAddress456" }],
                    }),
                })
            );
        });

        it("should validate existing wallet against onCreateConfig admin signer", async () => {
            mockApiClient.getWallet.mockResolvedValue(mockWalletWithAdminAndDelegated);

            const args: WalletArgsFor<"solana"> = {
                chain: "solana",
                signer: {
                    type: "external-wallet",
                    address: "DelegatedSignerAddress456",
                },
                onCreateConfig: {
                    adminSigner: {
                        type: "external-wallet",
                        address: "AdminSignerAddress123",
                    },
                    delegatedSigners: [{ signer: "external-wallet:DelegatedSignerAddress456" }],
                },
            };

            await expect(walletFactory.getOrCreateWallet(args)).resolves.toBeDefined();
        });

        it("should throw error when onCreateConfig admin signer does not match existing wallet", async () => {
            mockApiClient.getWallet.mockResolvedValue(mockWalletWithAdminAndDelegated);

            const args: WalletArgsFor<"solana"> = {
                chain: "solana",
                signer: {
                    type: "external-wallet",
                    address: "DelegatedSignerAddress456",
                },
                onCreateConfig: {
                    adminSigner: {
                        type: "external-wallet",
                        address: "WrongAdminAddress",
                    },
                },
            };

            await expect(walletFactory.getOrCreateWallet(args)).rejects.toThrow(WalletCreationError);
        });

        it("should validate that signer can use the wallet when onCreateConfig is provided", async () => {
            mockApiClient.getWallet.mockResolvedValue(mockWalletWithAdminAndDelegated);

            const argsWithValidDelegatedSigner: WalletArgsFor<"solana"> = {
                chain: "solana",
                signer: {
                    type: "external-wallet",
                    address: "DelegatedSignerAddress456",
                },
                onCreateConfig: {
                    adminSigner: {
                        type: "external-wallet",
                        address: "AdminSignerAddress123",
                    },
                    delegatedSigners: [{ signer: "external-wallet:DelegatedSignerAddress456" }],
                },
            };

            await expect(walletFactory.getOrCreateWallet(argsWithValidDelegatedSigner)).resolves.toBeDefined();
        });

        it("should throw error when signer cannot use wallet with onCreateConfig", async () => {
            mockApiClient.getWallet.mockResolvedValue(mockWalletWithAdminAndDelegated);

            const argsWithInvalidSigner: WalletArgsFor<"solana"> = {
                chain: "solana",
                signer: {
                    type: "external-wallet",
                    address: "UnauthorizedSignerAddress",
                },
                onCreateConfig: {
                    adminSigner: {
                        type: "external-wallet",
                        address: "AdminSignerAddress123",
                    },
                    delegatedSigners: [{ signer: "external-wallet:DelegatedSignerAddress456" }],
                },
            };

            await expect(walletFactory.getOrCreateWallet(argsWithInvalidSigner)).rejects.toThrow(
                new WalletCreationError(
                    `Signer cannot use wallet "9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM". The provided signer is neither the admin nor a delegated signer.`
                )
            );
        });
    });

});
