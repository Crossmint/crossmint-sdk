import { afterEach, beforeEach, describe, expect, it, vi, type MockedFunction } from "vitest";
import { WalletFactory } from "./wallet-factory";
import { InvalidEnvironmentError, WalletCreationError } from "../utils/errors";
import { walletsLogger } from "../logger";
import type { ApiClient, GetWalletSuccessResponse } from "../api";
import type { WalletArgsFor, WalletCreateArgs } from "./types";
import { APIKeyEnvironmentPrefix } from "@crossmint/common-sdk-base";

type MockedApiClient = {
    isServerSide: boolean;
    crossmint: { projectId: string };
    environment: string;
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
            environment: APIKeyEnvironmentPrefix.STAGING,
            getWallet: vi.fn(),
            createWallet: vi.fn(),
        };

        walletFactory = new WalletFactory(mockApiClient as unknown as ApiClient);
        walletsLogger.debug = vi.fn();
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    describe("createWallet with adminSigner and delegatedSigners", () => {
        it("should create wallet with top-level adminSigner", async () => {
            mockApiClient.createWallet.mockResolvedValue(mockWalletWithAdminAndDelegated);

            const args: WalletCreateArgs<"solana"> = {
                chain: "solana",
                signer: {
                    type: "external-wallet",
                    address: "DelegatedSignerAddress456",
                },
                adminSigner: {
                    type: "external-wallet",
                    address: "AdminSignerAddress123",
                },
                delegatedSigners: [{ type: "external-wallet", address: "DelegatedSignerAddress456" }],
            };

            await walletFactory.createWallet(args);

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

        it("should throw error when neither signer nor adminSigner is provided", async () => {
            const args: WalletCreateArgs<"solana"> = {
                chain: "solana",
            };

            await expect(walletFactory.createWallet(args)).rejects.toThrow(WalletCreationError);
        });
    });

    describe("getWallet validation", () => {
        it("should validate existing wallet against signer", async () => {
            mockApiClient.getWallet.mockResolvedValue(mockWalletWithAdminAndDelegated);

            const args: WalletArgsFor<"solana"> = {
                chain: "solana",
                signer: {
                    type: "external-wallet",
                    address: "DelegatedSignerAddress456",
                },
            };

            await expect(walletFactory.getWallet(args)).resolves.toBeDefined();
        });

        it("should throw error when signer cannot use wallet", async () => {
            mockApiClient.getWallet.mockResolvedValue(mockWalletWithAdminAndDelegated);

            const argsWithInvalidSigner: WalletArgsFor<"solana"> = {
                chain: "solana",
                signer: {
                    type: "external-wallet",
                    address: "UnauthorizedSignerAddress",
                },
            };

            await expect(walletFactory.getWallet(argsWithInvalidSigner)).rejects.toThrow(
                new WalletCreationError(
                    `Signer cannot use wallet "9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM". The provided signer is neither the admin nor a delegated signer.`
                )
            );
        });

        it("should allow read-only wallet without signer", async () => {
            mockApiClient.getWallet.mockResolvedValue(mockWalletWithAdminAndDelegated);

            const args: WalletArgsFor<"solana"> = {
                chain: "solana",
            };

            await expect(walletFactory.getWallet(args)).resolves.toBeDefined();
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

            it("should throw when walletLocator parameter is used on client side", async () => {
                const args: WalletArgsFor<"solana"> = {
                    chain: "solana",
                    signer: {
                        type: "external-wallet",
                        address: "AdminSignerAddress123",
                    },
                };

                await expect(walletFactory.getWallet("email:user@example.com:solana:smart", args)).rejects.toThrow(
                    "getWallet with walletLocator is only available on the server side. Use getWallet(args) instead."
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

describe("WalletFactory - Chain Environment Validation", () => {
    let walletFactory: WalletFactory;
    let mockApiClient: MockedApiClient;
    let warnSpy: ReturnType<typeof vi.spyOn>;
    let debugSpy: ReturnType<typeof vi.fn>;

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
        warnSpy = vi.spyOn(walletsLogger, "warn");
        debugSpy = vi.fn();
        (walletsLogger as unknown as { debug: typeof debugSpy }).debug = debugSpy;
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

        it("should allow mainnet chain in production environment without warning", async () => {
            mockApiClient.getWallet.mockResolvedValue(mockEvmWallet);

            const mainnetArgs: WalletArgsFor<"base"> = {
                chain: "base",
                signer: {
                    type: "external-wallet",
                    address: "0xAdminSignerAddress123456789012345678901234",
                },
            };

            await expect(walletFactory.getWallet(mainnetArgs)).resolves.toBeDefined();
            expect(warnSpy).not.toHaveBeenCalledWith(
                "walletFactory.validateChainEnvironment.mismatch",
                expect.anything()
            );
        });

        it("should throw error when using testnet chain in production environment", async () => {
            mockApiClient.getWallet.mockResolvedValue(mockEvmWallet);

            const testnetArgs: WalletArgsFor<"base-sepolia"> = {
                chain: "base-sepolia",
                signer: {
                    type: "external-wallet",
                    address: "0xAdminSignerAddress123456789012345678901234",
                },
            };

            await expect(walletFactory.getWallet(testnetArgs)).rejects.toThrow(InvalidEnvironmentError);
            await expect(walletFactory.getWallet(testnetArgs)).rejects.toThrow(
                'Chain "base-sepolia" is a testnet chain and cannot be used in production. Please use a mainnet chain instead.'
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

            await expect(walletFactory.getWallet(solanaArgs)).resolves.toBeDefined();
            expect(warnSpy).not.toHaveBeenCalledWith(
                "walletFactory.validateChainEnvironment.mismatch",
                expect.anything()
            );
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

            await expect(walletFactory.getWallet(stellarArgs)).resolves.toBeDefined();
            expect(warnSpy).not.toHaveBeenCalledWith(
                "walletFactory.validateChainEnvironment.mismatch",
                expect.anything()
            );
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

        it("should allow testnet chain in staging environment without warning", async () => {
            mockApiClient.getWallet.mockResolvedValue(mockEvmWallet);

            const testnetArgs: WalletArgsFor<"base-sepolia"> = {
                chain: "base-sepolia",
                signer: {
                    type: "external-wallet",
                    address: "0xAdminSignerAddress123456789012345678901234",
                },
            };

            await expect(walletFactory.getWallet(testnetArgs)).resolves.toBeDefined();
            expect(warnSpy).not.toHaveBeenCalledWith(
                "walletFactory.validateChainEnvironment.mismatch",
                expect.anything()
            );
        });

        it("should auto-convert mainnet chain to testnet equivalent in staging environment", async () => {
            mockApiClient.getWallet.mockResolvedValue(mockEvmWallet);

            const mainnetArgs: WalletArgsFor<"base"> = {
                chain: "base",
                signer: {
                    type: "external-wallet",
                    address: "0xAdminSignerAddress123456789012345678901234",
                },
            };

            await expect(walletFactory.getWallet(mainnetArgs)).resolves.toBeDefined();
            expect(debugSpy).toHaveBeenCalledWith("walletFactory.validateChainEnvironment.autoConverted", {
                chain: "base",
                convertedTo: "base-sepolia",
                environment: APIKeyEnvironmentPrefix.STAGING,
                message:
                    'Chain "base" is a mainnet chain and cannot be used in staging environment. Automatically converted to "base-sepolia".',
            });
        });

        it("should warn for mainnet chain with no testnet equivalent in staging", async () => {
            mockApiClient.getWallet.mockResolvedValue(mockEvmWallet);

            const mainnetArgs: WalletArgsFor<"arbitrumnova"> = {
                chain: "arbitrumnova",
                signer: {
                    type: "external-wallet",
                    address: "0xAdminSignerAddress123456789012345678901234",
                },
            };

            await expect(walletFactory.getWallet(mainnetArgs)).resolves.toBeDefined();
            expect(debugSpy).toHaveBeenCalledWith("walletFactory.validateChainEnvironment.mismatch", {
                chain: "arbitrumnova",
                environment: APIKeyEnvironmentPrefix.STAGING,
                message:
                    'Chain "arbitrumnova" is a mainnet chain and should not be used in staging environment. No testnet equivalent is available. Please use a testnet chain instead.',
            });
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

        it("should allow testnet chain in development environment without warning", async () => {
            mockApiClient.getWallet.mockResolvedValue(mockEvmWallet);

            const testnetArgs: WalletArgsFor<"polygon-amoy"> = {
                chain: "polygon-amoy",
                signer: {
                    type: "external-wallet",
                    address: "0xAdminSignerAddress123456789012345678901234",
                },
            };

            await expect(walletFactory.getWallet(testnetArgs)).resolves.toBeDefined();
            expect(warnSpy).not.toHaveBeenCalledWith(
                "walletFactory.validateChainEnvironment.mismatch",
                expect.anything()
            );
        });

        it("should auto-convert mainnet chain to testnet equivalent in development environment", async () => {
            mockApiClient.getWallet.mockResolvedValue(mockEvmWallet);

            const mainnetArgs: WalletArgsFor<"polygon"> = {
                chain: "polygon",
                signer: {
                    type: "external-wallet",
                    address: "0xAdminSignerAddress123456789012345678901234",
                },
            };

            await expect(walletFactory.getWallet(mainnetArgs)).resolves.toBeDefined();
            expect(debugSpy).toHaveBeenCalledWith("walletFactory.validateChainEnvironment.autoConverted", {
                chain: "polygon",
                convertedTo: "polygon-amoy",
                environment: APIKeyEnvironmentPrefix.DEVELOPMENT,
                message:
                    'Chain "polygon" is a mainnet chain and cannot be used in development environment. Automatically converted to "polygon-amoy".',
            });
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
            mockApiClient.getWallet.mockResolvedValue(mockEvmWallet);

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

        it("should allow mainnet chain in production with getWallet without warning", async () => {
            mockApiClient.getWallet.mockResolvedValue(mockEvmWallet);

            const mainnetArgs: WalletArgsFor<"base"> = {
                chain: "base",
                signer: {
                    type: "external-wallet",
                    address: "0xAdminSignerAddress123456789012345678901234",
                },
            };

            await expect(walletFactory.getWallet("wallet-locator", mainnetArgs)).resolves.toBeDefined();
            expect(warnSpy).not.toHaveBeenCalledWith(
                "walletFactory.validateChainEnvironment.mismatch",
                expect.anything()
            );
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
            mockApiClient.createWallet.mockResolvedValue(mockEvmWallet);

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
