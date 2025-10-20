import { afterEach, beforeEach, describe, expect, it, vi, type MockedFunction } from "vitest";
import { WalletFactory } from "./wallet-factory";
import { WalletCreationError } from "../utils/errors";
import type { ApiClient, GetWalletSuccessResponse } from "../api";
import type { WalletArgsFor, WalletCreateArgs } from "./types";

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
            mockApiClient.getWallet.mockResolvedValue({ error: true, message: "not found" });
            mockApiClient.createWallet.mockResolvedValue(mockWalletWithAdminAndDelegated);

            const args: WalletCreateArgs<"solana"> = {
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
                    delegatedSigners: [{ type: "external-wallet", address: "DelegatedSignerAddress456" }],
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

            const args: WalletCreateArgs<"solana"> = {
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
                    delegatedSigners: [{ type: "external-wallet", address: "DelegatedSignerAddress456" }],
                },
            };

            await expect(walletFactory.getOrCreateWallet(args)).resolves.toBeDefined();
        });

        it("should throw error when onCreateConfig admin signer does not match existing wallet", async () => {
            mockApiClient.getWallet.mockResolvedValue(mockWalletWithAdminAndDelegated);

            const args: WalletCreateArgs<"solana"> = {
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

            const argsWithValidDelegatedSigner: WalletCreateArgs<"solana"> = {
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
                    delegatedSigners: [{ type: "external-wallet", address: "DelegatedSignerAddress456" }],
                },
            };

            await expect(walletFactory.getOrCreateWallet(argsWithValidDelegatedSigner)).resolves.toBeDefined();
        });

        it("should throw error when signer cannot use wallet with onCreateConfig", async () => {
            mockApiClient.getWallet.mockResolvedValue(mockWalletWithAdminAndDelegated);

            const argsWithInvalidSigner: WalletCreateArgs<"solana"> = {
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
                    delegatedSigners: [{ type: "external-wallet", address: "DelegatedSignerAddress456" }],
                },
            };

            await expect(walletFactory.getOrCreateWallet(argsWithInvalidSigner)).rejects.toThrow(
                new WalletCreationError(
                    `Signer cannot use wallet "9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM". The provided signer is neither the admin nor a delegated signer.`
                )
            );
        });
    });

    describe("getWallet - Unified client and server side usage", () => {
        describe("Client-side usage", () => {
            beforeEach(() => {
                mockApiClient.isServerSide = false;
            });

            it("should fetch wallet with single parameter (args only)", async () => {
                mockApiClient.getWallet.mockResolvedValue(mockWalletWithAdminAndDelegated);

                const args: WalletArgsFor<"solana"> = {
                    chain: "solana",
                    signer: {
                        type: "external-wallet",
                        address: "AdminSignerAddress123",
                    },
                };

                const wallet = await walletFactory.getWallet(args);

                expect(mockApiClient.getWallet).toHaveBeenCalledWith("me:solana:smart");
                expect(wallet).toBeDefined();
                expect(wallet.address).toBe("9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM");
            });

            it("should construct correct locator for EVM chains", async () => {
                const evmWallet = {
                    chainType: "evm" as const,
                    type: "smart" as const,
                    address: "0x123",
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
                mockApiClient.getWallet.mockResolvedValue(evmWallet);

                const args: WalletArgsFor<"base"> = {
                    chain: "base",
                    signer: {
                        type: "external-wallet",
                        address: "AdminSignerAddress123",
                    },
                };

                await walletFactory.getWallet(args);

                expect(mockApiClient.getWallet).toHaveBeenCalledWith("me:evm:smart");
            });

            it("should construct correct locator for Stellar chains", async () => {
                const stellarWallet = {
                    chainType: "stellar" as const,
                    type: "smart" as const,
                    address: "GTEST123",
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
                mockApiClient.getWallet.mockResolvedValue(stellarWallet);

                const args: WalletArgsFor<"stellar"> = {
                    chain: "stellar",
                    signer: {
                        type: "external-wallet",
                        address: "AdminSignerAddress123",
                    },
                };

                await walletFactory.getWallet(args);

                expect(mockApiClient.getWallet).toHaveBeenCalledWith("me:stellar:smart");
            });

            it("should throw error when trying to use walletLocator parameter on client side", async () => {
                const args: WalletArgsFor<"solana"> = {
                    chain: "solana",
                    signer: {
                        type: "external-wallet",
                        address: "AdminSignerAddress123",
                    },
                };

                await expect(walletFactory.getWallet("email:user@example.com:solana:smart", args)).rejects.toThrow(
                    new WalletCreationError(
                        "getWallet with walletLocator is not supported on client side, use getOrCreateWallet instead"
                    )
                );
            });

            it("should throw error when wallet not found", async () => {
                mockApiClient.getWallet.mockResolvedValue({ error: true, message: "not found" });

                const args: WalletArgsFor<"solana"> = {
                    chain: "solana",
                    signer: {
                        type: "external-wallet",
                        address: "AdminSignerAddress123",
                    },
                };

                await expect(walletFactory.getWallet(args)).rejects.toThrow();
            });
        });

        describe("Server-side usage", () => {
            beforeEach(() => {
                mockApiClient.isServerSide = true;
            });

            it("should fetch wallet with walletLocator parameter", async () => {
                mockApiClient.getWallet.mockResolvedValue(mockWalletWithAdminAndDelegated);

                const walletLocator = "email:user@example.com:solana:smart";
                const args: WalletArgsFor<"solana"> = {
                    chain: "solana",
                    signer: {
                        type: "external-wallet",
                        address: "AdminSignerAddress123",
                    },
                };

                const wallet = await walletFactory.getWallet(walletLocator, args);

                expect(mockApiClient.getWallet).toHaveBeenCalledWith(walletLocator);
                expect(wallet).toBeDefined();
                expect(wallet.address).toBe("9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM");
            });

            it("should work with different walletLocator formats", async () => {
                mockApiClient.getWallet.mockResolvedValue(mockWalletWithAdminAndDelegated);

                const testCases = [
                    "email:user@example.com:solana:smart",
                    "phone:+1234567890:evm:smart",
                    "external-wallet:0x123:evm:smart",
                ];

                const args: WalletArgsFor<"solana"> = {
                    chain: "solana",
                    signer: {
                        type: "external-wallet",
                        address: "AdminSignerAddress123",
                    },
                };

                for (const locator of testCases) {
                    await walletFactory.getWallet(locator, args);
                    expect(mockApiClient.getWallet).toHaveBeenCalledWith(locator);
                }
            });

            it("should throw error when walletLocator is not provided on server side", async () => {
                const args: WalletArgsFor<"solana"> = {
                    chain: "solana",
                    signer: {
                        type: "external-wallet",
                        address: "AdminSignerAddress123",
                    },
                };

                await expect(walletFactory.getWallet(args)).rejects.toThrow(
                    new WalletCreationError(
                        "getWallet on server side requires a walletLocator parameter. Use getWallet(walletLocator, args) instead."
                    )
                );
            });

            it("should throw error when wallet not found", async () => {
                mockApiClient.getWallet.mockResolvedValue({ error: true, message: "not found" });

                const args: WalletArgsFor<"solana"> = {
                    chain: "solana",
                    signer: {
                        type: "external-wallet",
                        address: "AdminSignerAddress123",
                    },
                };

                await expect(walletFactory.getWallet("email:user@example.com:solana:smart", args)).rejects.toThrow();
            });

            it("should validate signer can use the wallet", async () => {
                mockApiClient.getWallet.mockResolvedValue(mockWalletWithAdminAndDelegated);

                const validArgs: WalletArgsFor<"solana"> = {
                    chain: "solana",
                    signer: {
                        type: "external-wallet",
                        address: "AdminSignerAddress123",
                    },
                };

                await expect(
                    walletFactory.getWallet("email:user@example.com:solana:smart", validArgs)
                ).resolves.toBeDefined();

                const invalidArgs: WalletArgsFor<"solana"> = {
                    chain: "solana",
                    signer: {
                        type: "external-wallet",
                        address: "UnauthorizedAddress",
                    },
                };

                await expect(
                    walletFactory.getWallet("email:user@example.com:solana:smart", invalidArgs)
                ).rejects.toThrow(WalletCreationError);
            });
        });
    });
});
