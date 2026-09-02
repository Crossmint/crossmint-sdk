import { afterEach, beforeEach, describe, expect, it, vi, type MockedFunction } from "vitest";
import { WalletFactory } from "./wallet-factory";
import {
    DuplicateRecoverySignerError,
    InvalidChainError,
    InvalidEnvironmentError,
    InvalidRecoveryConfigError,
    MAX_RECOVERY_SIGNERS,
    RecoveryNotSupportedOnChainError,
    RecoverySignerLimitExceededError,
    WalletCreationError,
} from "../utils/errors";
import { walletsLogger } from "../logger";
import type { ApiClient, GetWalletSuccessResponse } from "../api";
import type { WalletArgsFor, WalletCreateArgs } from "./types";
import { APIKeyEnvironmentPrefix } from "@crossmint/common-sdk-base";
import { deriveServerSignerDetails } from "../signers/server";

type MockedApiClient = {
    isServerSide: boolean;
    crossmint: { projectId: string };
    projectId: string;
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
            projectId: "test-project",
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

    describe("createWallet with recovery and signers", () => {
        it("creates wallet with top-level recovery", async () => {
            mockApiClient.createWallet.mockResolvedValue(mockWalletWithAdminAndDelegated);

            const args: WalletCreateArgs<"solana"> = {
                chain: "solana",
                recovery: {
                    type: "external-wallet",
                    address: "AdminSignerAddress123",
                },
                signers: [{ type: "external-wallet", address: "DelegatedSignerAddress456" }],
            };

            await walletFactory.createWallet(args);

            expect(mockApiClient.createWallet).toHaveBeenCalledWith(
                expect.objectContaining({
                    config: expect.objectContaining({
                        adminSigner: expect.objectContaining({
                            type: "external-wallet",
                            address: "AdminSignerAddress123",
                        }),
                    }),
                })
            );
        });
    });

    describe("createWallet with device signer", () => {
        // A valid uncompressed P-256 public key in base64: 0x04 + 32-byte x + 32-byte y = 65 bytes.
        const validDevicePublicKeyBase64 = Buffer.concat([
            Buffer.from([0x04]),
            Buffer.alloc(32, 1),
            Buffer.alloc(32, 2),
        ]).toString("base64");

        const createMockDeviceSignerKeyStorage = () => ({
            getKey: vi.fn().mockResolvedValue(null),
            saveKey: vi.fn().mockResolvedValue(undefined),
            generateKey: vi.fn().mockResolvedValue(validDevicePublicKeyBase64),
            getDeviceName: vi.fn().mockReturnValue("Chrome on Mac"),
        });

        const solanaWalletResponse = (delegatedSigners: unknown[] = []) =>
            ({
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
                    delegatedSigners,
                },
                createdAt: Date.now(),
            }) as GetWalletSuccessResponse;

        it("injects device signer for Solana wallets at creation time when deviceSignerKeyStorage is provided", async () => {
            mockApiClient.createWallet.mockResolvedValue(solanaWalletResponse());

            const mockDeviceSignerKeyStorage = createMockDeviceSignerKeyStorage();

            const args: WalletCreateArgs<"solana"> = {
                chain: "solana",
                recovery: {
                    type: "external-wallet",
                    address: "AdminSignerAddress123",
                },
                options: {
                    deviceSignerKeyStorage: mockDeviceSignerKeyStorage as unknown as any,
                },
            };

            await walletFactory.createWallet(args);

            // Parity with EVM/Stellar: the device signer is in the creation payload.
            const call = mockApiClient.createWallet.mock.calls[0]?.[0];
            expect(call?.config?.delegatedSigners).toHaveLength(1);
            expect(call?.config?.delegatedSigners?.[0]).toEqual(
                expect.objectContaining({
                    signer: expect.objectContaining({ type: "device" }),
                })
            );
            expect(mockDeviceSignerKeyStorage.generateKey).toHaveBeenCalled();
        });

        it("retries Solana creation without the device signer when the backend rejects it with DEVICE_SIGNER_NOT_SUPPORTED", async () => {
            // First attempt (with device signer) is rejected; the retry (without it) succeeds.
            mockApiClient.createWallet
                .mockResolvedValueOnce({
                    error: true,
                    message: "Device signers are not currently supported for this Solana wallet.",
                    code: "DEVICE_SIGNER_NOT_SUPPORTED",
                } as any)
                .mockResolvedValueOnce(solanaWalletResponse());

            const mockDeviceSignerKeyStorage = createMockDeviceSignerKeyStorage();

            const args: WalletCreateArgs<"solana"> = {
                chain: "solana",
                recovery: {
                    type: "external-wallet",
                    address: "AdminSignerAddress123",
                },
                options: {
                    deviceSignerKeyStorage: mockDeviceSignerKeyStorage as unknown as any,
                },
            };

            await expect(walletFactory.createWallet(args)).resolves.toBeDefined();

            expect(mockApiClient.createWallet).toHaveBeenCalledTimes(2);
            const firstCall = mockApiClient.createWallet.mock.calls[0]?.[0];
            expect(firstCall?.config?.delegatedSigners).toHaveLength(1);
            expect(firstCall?.config?.delegatedSigners?.[0]).toEqual(
                expect.objectContaining({ signer: expect.objectContaining({ type: "device" }) })
            );
            // Retry strips the auto-injected device signer.
            const secondCall = mockApiClient.createWallet.mock.calls[1]?.[0];
            expect(secondCall?.config?.delegatedSigners ?? []).toHaveLength(0);
        });

        it("does not retry when a non-device-signer error is returned", async () => {
            mockApiClient.createWallet.mockResolvedValue({
                error: true,
                message: "Some unrelated creation failure",
            } as any);

            const mockDeviceSignerKeyStorage = createMockDeviceSignerKeyStorage();

            const args: WalletCreateArgs<"solana"> = {
                chain: "solana",
                recovery: {
                    type: "external-wallet",
                    address: "AdminSignerAddress123",
                },
                options: {
                    deviceSignerKeyStorage: mockDeviceSignerKeyStorage as unknown as any,
                },
            };

            await expect(walletFactory.createWallet(args)).rejects.toThrow(WalletCreationError);
            // A generic error must surface as-is, without a silent retry that could mask it.
            expect(mockApiClient.createWallet).toHaveBeenCalledTimes(1);
        });

        it("does not strip an explicitly-provided device signer on rejection", async () => {
            // A rejection for a caller-supplied signer is a genuine error, not something to drop.
            mockApiClient.createWallet.mockResolvedValue({
                error: true,
                message: "Device signers are not currently supported for this Solana wallet.",
                code: "DEVICE_SIGNER_NOT_SUPPORTED",
            } as any);

            const mockDeviceSignerKeyStorage = createMockDeviceSignerKeyStorage();

            const args: WalletCreateArgs<"solana"> = {
                chain: "solana",
                recovery: {
                    type: "external-wallet",
                    address: "AdminSignerAddress123",
                },
                signers: [{ type: "device", locator: `device:${validDevicePublicKeyBase64}` }],
                options: {
                    deviceSignerKeyStorage: mockDeviceSignerKeyStorage as unknown as any,
                },
            };

            await expect(walletFactory.createWallet(args)).rejects.toThrow(WalletCreationError);
            expect(mockApiClient.createWallet).toHaveBeenCalledTimes(1);
        });

        it("injects device signer for EVM wallets when deviceSignerKeyStorage is provided", async () => {
            const evmWallet = {
                chainType: "evm" as const,
                type: "smart" as const,
                address: "0x123",
                owner: "test-owner",
                config: {
                    adminSigner: {
                        type: "external-wallet" as const,
                        address: "0xAdminSignerAddress123",
                        locator: "external-wallet:0xAdminSignerAddress123",
                    },
                    delegatedSigners: [
                        {
                            type: "device" as const,
                            locator: "device:someLocator",
                        },
                    ],
                },
                createdAt: Date.now(),
            } as GetWalletSuccessResponse;

            mockApiClient.createWallet.mockResolvedValue(evmWallet);

            // Create a valid P-256 public key in base64 format:
            // 0x04 (1 byte) + 32 bytes x + 32 bytes y = 65 bytes total
            const publicKeyBytes = Buffer.concat([
                Buffer.from([0x04]), // uncompressed point indicator
                Buffer.alloc(32, 1), // x coordinate (32 bytes)
                Buffer.alloc(32, 2), // y coordinate (32 bytes)
            ]);
            const publicKeyBase64 = publicKeyBytes.toString("base64");

            const mockDeviceSignerKeyStorage = {
                getKey: vi.fn().mockResolvedValue(null),
                saveKey: vi.fn().mockResolvedValue(undefined),
                generateKey: vi.fn().mockResolvedValue(publicKeyBase64),
                getDeviceName: vi.fn().mockReturnValue("Chrome on Mac"),
            };

            const args: WalletCreateArgs<"base"> = {
                chain: "base",
                recovery: {
                    type: "external-wallet",
                    address: "0xAdminSignerAddress123",
                },
                options: {
                    deviceSignerKeyStorage: mockDeviceSignerKeyStorage as unknown as any,
                },
            };

            await walletFactory.createWallet(args);

            // Verify that a device signer was added to delegatedSigners
            const call = mockApiClient.createWallet.mock.calls[0]?.[0];
            expect(call?.config?.delegatedSigners).toBeDefined();
            expect(call?.config?.delegatedSigners).toHaveLength(1);
            expect(call?.config?.delegatedSigners?.[0]).toEqual(
                expect.objectContaining({
                    signer: expect.objectContaining({
                        type: "device",
                        publicKey: expect.objectContaining({
                            x: expect.any(String),
                            y: expect.any(String),
                        }),
                        name: "Chrome on Mac",
                    }),
                })
            );
        });
    });

    describe("getWallet validation", () => {
        it("gets wallet without signer (device signer resolved automatically)", async () => {
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

            it("fetches wallet with single parameter (args only)", async () => {
                mockApiClient.getWallet.mockResolvedValue(mockWalletWithAdminAndDelegated);

                const args: WalletArgsFor<"solana"> = {
                    chain: "solana",
                };

                const wallet = await walletFactory.getWallet(args);

                expect(mockApiClient.getWallet).toHaveBeenCalledWith("me:solana:smart");
                expect(wallet).toBeDefined();
                expect(wallet.address).toBe("9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM");
            });

            it("constructs correct locator for EVM chains", async () => {
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
                };

                await walletFactory.getWallet(args);

                expect(mockApiClient.getWallet).toHaveBeenCalledWith("me:evm:smart");
            });

            it("constructs correct locator for Stellar chains", async () => {
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
                };

                await walletFactory.getWallet(args);

                expect(mockApiClient.getWallet).toHaveBeenCalledWith("me:stellar:smart");
            });

            it("throws when walletLocator parameter is used on client side", async () => {
                const args: WalletArgsFor<"solana"> = {
                    chain: "solana",
                };

                await expect(walletFactory.getWallet("email:user@example.com:solana:smart", args)).rejects.toThrow(
                    "getWallet with walletLocator is only available on the server side. Use getWallet(args) instead."
                );
            });

            it("throws error when wallet not found", async () => {
                mockApiClient.getWallet.mockResolvedValue({ error: true, message: "not found" });

                const args: WalletArgsFor<"solana"> = {
                    chain: "solana",
                };

                await expect(walletFactory.getWallet(args)).rejects.toThrow();
            });
        });

        describe("Server-side usage", () => {
            beforeEach(() => {
                mockApiClient.isServerSide = true;
            });

            it("fetches wallet with walletLocator parameter", async () => {
                mockApiClient.getWallet.mockResolvedValue(mockWalletWithAdminAndDelegated);

                const walletLocator = "email:user@example.com:solana:smart";
                const args: WalletArgsFor<"solana"> = {
                    chain: "solana",
                };

                const wallet = await walletFactory.getWallet(walletLocator, args);

                expect(mockApiClient.getWallet).toHaveBeenCalledWith(walletLocator);
                expect(wallet).toBeDefined();
                expect(wallet.address).toBe("9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM");
            });

            it("works with different walletLocator formats", async () => {
                mockApiClient.getWallet.mockResolvedValue(mockWalletWithAdminAndDelegated);

                const testCases = [
                    "email:user@example.com:solana:smart",
                    "phone:+1234567890:evm:smart",
                    "external-wallet:0x123:evm:smart",
                ];

                const args: WalletArgsFor<"solana"> = {
                    chain: "solana",
                };

                for (const locator of testCases) {
                    await walletFactory.getWallet(locator, args);
                    expect(mockApiClient.getWallet).toHaveBeenCalledWith(locator);
                }
            });

            it("throws error when walletLocator is not provided on server side", async () => {
                const args: WalletArgsFor<"solana"> = {
                    chain: "solana",
                };

                await expect(walletFactory.getWallet(args)).rejects.toThrow(
                    new WalletCreationError(
                        "getWallet on server side requires a walletLocator parameter. Use getWallet(walletLocator, args) instead."
                    )
                );
            });

            it("throws error when wallet not found", async () => {
                mockApiClient.getWallet.mockResolvedValue({ error: true, message: "not found" });

                const args: WalletArgsFor<"solana"> = {
                    chain: "solana",
                };

                await expect(walletFactory.getWallet("email:user@example.com:solana:smart", args)).rejects.toThrow();
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
                projectId: "test-project",
                environment: APIKeyEnvironmentPrefix.PRODUCTION,
                getWallet: vi.fn(),
                createWallet: vi.fn(),
            };
            walletFactory = new WalletFactory(mockApiClient as unknown as ApiClient);
        });

        it("allows mainnet chain in production environment without warning", async () => {
            mockApiClient.getWallet.mockResolvedValue(mockEvmWallet);

            const mainnetArgs: WalletArgsFor<"base"> = {
                chain: "base",
            };

            await expect(walletFactory.getWallet(mainnetArgs)).resolves.toBeDefined();
            expect(warnSpy).not.toHaveBeenCalledWith(
                "walletFactory.validateChainEnvironment.mismatch",
                expect.anything()
            );
        });

        it("throws error when using testnet chain in production environment", async () => {
            mockApiClient.getWallet.mockResolvedValue(mockEvmWallet);

            const testnetArgs: WalletArgsFor<"base-sepolia"> = {
                chain: "base-sepolia",
            };

            await expect(walletFactory.getWallet(testnetArgs)).rejects.toThrow(InvalidEnvironmentError);
            await expect(walletFactory.getWallet(testnetArgs)).rejects.toThrow(
                'Chain "base-sepolia" is a testnet chain and cannot be used in production. Please use a mainnet chain instead.'
            );
        });

        it("allows solana chain in production environment (no validation)", async () => {
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
            };

            await expect(walletFactory.getWallet(solanaArgs)).resolves.toBeDefined();
            expect(warnSpy).not.toHaveBeenCalledWith(
                "walletFactory.validateChainEnvironment.mismatch",
                expect.anything()
            );
        });

        it("allows stellar chain in production environment (no validation)", async () => {
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
                projectId: "test-project",
                environment: APIKeyEnvironmentPrefix.STAGING,
                getWallet: vi.fn(),
                createWallet: vi.fn(),
            };
            walletFactory = new WalletFactory(mockApiClient as unknown as ApiClient);
        });

        it("allows testnet chain in staging environment without warning", async () => {
            mockApiClient.getWallet.mockResolvedValue(mockEvmWallet);

            const testnetArgs: WalletArgsFor<"base-sepolia"> = {
                chain: "base-sepolia",
            };

            await expect(walletFactory.getWallet(testnetArgs)).resolves.toBeDefined();
            expect(warnSpy).not.toHaveBeenCalledWith(
                "walletFactory.validateChainEnvironment.mismatch",
                expect.anything()
            );
        });

        it("auto-converts mainnet chain to testnet equivalent in staging environment", async () => {
            mockApiClient.getWallet.mockResolvedValue(mockEvmWallet);

            const mainnetArgs: WalletArgsFor<"base"> = {
                chain: "base",
            };

            await expect(walletFactory.getWallet(mainnetArgs)).resolves.toBeDefined();
            expect(debugSpy).toHaveBeenCalledWith("validateChainForEnvironment.autoConverted", {
                chain: "base",
                convertedTo: "base-sepolia",
                environment: APIKeyEnvironmentPrefix.STAGING,
                message:
                    'Chain "base" is a mainnet chain and cannot be used in staging environment. Automatically converted to "base-sepolia".',
            });
        });

        it("warns for mainnet chain with no testnet equivalent in staging", async () => {
            mockApiClient.getWallet.mockResolvedValue(mockEvmWallet);

            const mainnetArgs: WalletArgsFor<"arbitrumnova"> = {
                chain: "arbitrumnova",
            };

            await expect(walletFactory.getWallet(mainnetArgs)).resolves.toBeDefined();
            expect(debugSpy).toHaveBeenCalledWith("validateChainForEnvironment.mismatch", {
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
                projectId: "test-project",
                environment: APIKeyEnvironmentPrefix.DEVELOPMENT,
                getWallet: vi.fn(),
                createWallet: vi.fn(),
            };
            walletFactory = new WalletFactory(mockApiClient as unknown as ApiClient);
        });

        it("allows testnet chain in development environment without warning", async () => {
            mockApiClient.getWallet.mockResolvedValue(mockEvmWallet);

            const testnetArgs: WalletArgsFor<"polygon-amoy"> = {
                chain: "polygon-amoy",
            };

            await expect(walletFactory.getWallet(testnetArgs)).resolves.toBeDefined();
            expect(warnSpy).not.toHaveBeenCalledWith(
                "walletFactory.validateChainEnvironment.mismatch",
                expect.anything()
            );
        });

        it("auto-converts mainnet chain to testnet equivalent in development environment", async () => {
            mockApiClient.getWallet.mockResolvedValue(mockEvmWallet);

            const mainnetArgs: WalletArgsFor<"polygon"> = {
                chain: "polygon",
            };

            await expect(walletFactory.getWallet(mainnetArgs)).resolves.toBeDefined();
            expect(debugSpy).toHaveBeenCalledWith("validateChainForEnvironment.autoConverted", {
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
                projectId: "test-project",
                environment: APIKeyEnvironmentPrefix.PRODUCTION,
                getWallet: vi.fn(),
                createWallet: vi.fn(),
            };
            walletFactory = new WalletFactory(mockApiClient as unknown as ApiClient);
        });

        it("throws error when using testnet chain in production with getWallet", async () => {
            mockApiClient.getWallet.mockResolvedValue(mockEvmWallet);

            const testnetArgs: WalletArgsFor<"base-sepolia"> = {
                chain: "base-sepolia",
            };

            await expect(walletFactory.getWallet("wallet-locator", testnetArgs)).rejects.toThrow(
                InvalidEnvironmentError
            );
        });

        it("allows mainnet chain in production with getWallet without warning", async () => {
            mockApiClient.getWallet.mockResolvedValue(mockEvmWallet);

            const mainnetArgs: WalletArgsFor<"base"> = {
                chain: "base",
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
                projectId: "test-project",
                environment: APIKeyEnvironmentPrefix.PRODUCTION,
                getWallet: vi.fn(),
                createWallet: vi.fn(),
            };
            walletFactory = new WalletFactory(mockApiClient as unknown as ApiClient);
        });

        it("throws error when using testnet chain in production with createWallet", async () => {
            mockApiClient.createWallet.mockResolvedValue(mockEvmWallet);

            const testnetArgs: WalletCreateArgs<"base-sepolia"> = {
                chain: "base-sepolia",
                recovery: {
                    type: "external-wallet",
                    address: "0xAdminSignerAddress123456789012345678901234",
                },
            };

            await expect(walletFactory.createWallet(testnetArgs)).rejects.toThrow(InvalidEnvironmentError);
        });
    });

    describe("Unknown chain rejection", () => {
        beforeEach(() => {
            mockApiClient = {
                isServerSide: false,
                crossmint: { projectId: "test-project" },
                projectId: "test-project",
                environment: APIKeyEnvironmentPrefix.STAGING,
                getWallet: vi.fn(),
                createWallet: vi.fn(),
            };
            walletFactory = new WalletFactory(mockApiClient as unknown as ApiClient);
        });

        it("throws InvalidChainError for unknown chain in createWallet", async () => {
            const args = {
                chain: "not-a-chain" as any,
                recovery: {
                    type: "external-wallet" as const,
                    address: "0xAdminSignerAddress123456789012345678901234",
                },
            };

            await expect(walletFactory.createWallet(args)).rejects.toThrow(InvalidChainError);
            await expect(walletFactory.createWallet(args)).rejects.toThrow(/Unknown chain "not-a-chain"/);
            expect(mockApiClient.createWallet).not.toHaveBeenCalled();
        });

        it("throws InvalidChainError for unknown chain in getWallet", async () => {
            const args = {
                chain: "not-a-chain" as any,
            };

            await expect(walletFactory.getWallet(args)).rejects.toThrow(InvalidChainError);
            await expect(walletFactory.getWallet(args)).rejects.toThrow(/Unknown chain "not-a-chain"/);
            expect(mockApiClient.getWallet).not.toHaveBeenCalled();
        });

        it("throws InvalidChainError for unknown chain in server-side getWallet", async () => {
            mockApiClient.isServerSide = true;

            const args = {
                chain: "not-a-chain" as any,
            };

            await expect(walletFactory.getWallet("wallet-locator", args)).rejects.toThrow(InvalidChainError);
            expect(mockApiClient.getWallet).not.toHaveBeenCalled();
        });

        it("throws InvalidChainError for unknown chain regardless of environment", async () => {
            // Verify that the isValidChain guard fires before the environment check
            mockApiClient.environment = APIKeyEnvironmentPrefix.PRODUCTION;
            walletFactory = new WalletFactory(mockApiClient as unknown as ApiClient);

            const args = {
                chain: "not-a-chain" as any,
                recovery: {
                    type: "external-wallet" as const,
                    address: "0xAdminSignerAddress123456789012345678901234",
                },
            };

            await expect(walletFactory.createWallet(args)).rejects.toThrow(InvalidChainError);
            expect(mockApiClient.createWallet).not.toHaveBeenCalled();
        });
    });
});

describe("WalletFactory - Server Signer", () => {
    let walletFactory: WalletFactory;
    let mockApiClient: MockedApiClient;

    const TEST_SECRET = "a".repeat(64);
    const PROJECT_ID = "test-project";
    const ENVIRONMENT = APIKeyEnvironmentPrefix.STAGING;

    const { derivedAddress } = deriveServerSignerDetails(
        { type: "server", secret: TEST_SECRET },
        "base-sepolia",
        PROJECT_ID,
        ENVIRONMENT
    );

    // Cast needed: API types don't include "server" admin signer type yet
    const mockServerWalletResponse = {
        chainType: "evm" as const,
        type: "smart" as const,
        address: derivedAddress,
        owner: "test-owner",
        config: {
            adminSigner: {
                type: "server",
                address: derivedAddress,
                locator: `server:${derivedAddress}`,
            },
        },
        createdAt: Date.now(),
    } as unknown as GetWalletSuccessResponse;

    beforeEach(() => {
        vi.resetAllMocks();

        mockApiClient = {
            isServerSide: true,
            crossmint: { projectId: PROJECT_ID },
            projectId: PROJECT_ID,
            environment: ENVIRONMENT,
            getWallet: vi.fn(),
            createWallet: vi.fn(),
        };

        walletFactory = new WalletFactory(mockApiClient as unknown as ApiClient);
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    describe("createWallet with server recovery", () => {
        it("sends server type as admin signer to the API", async () => {
            mockApiClient.createWallet.mockResolvedValue(mockServerWalletResponse);

            const args: WalletCreateArgs<"base-sepolia"> = {
                chain: "base-sepolia",
                recovery: {
                    type: "server",
                    secret: TEST_SECRET,
                },
            };

            await walletFactory.createWallet(args);

            expect(mockApiClient.createWallet).toHaveBeenCalledWith(
                expect.objectContaining({
                    config: expect.objectContaining({
                        adminSigner: { type: "server", address: derivedAddress },
                    }),
                })
            );
        });
    });

    describe("createWallet with server signer as delegated signer", () => {
        it("resolves server signer to server:<derivedAddress> in signers", async () => {
            const walletResponse = {
                ...mockServerWalletResponse,
                config: {
                    adminSigner: {
                        type: "external-wallet" as const,
                        address: "0xAdminSignerAddress123456789012345678901234",
                        locator: "external-wallet:0xAdminSignerAddress123456789012345678901234",
                    },
                    delegatedSigners: [
                        {
                            locator: `server:${derivedAddress}`,
                            type: "server" as const,
                            address: derivedAddress,
                        },
                    ],
                },
            } as unknown as GetWalletSuccessResponse;
            mockApiClient.createWallet.mockResolvedValue(walletResponse);

            const args: WalletCreateArgs<"base-sepolia"> = {
                chain: "base-sepolia",
                recovery: {
                    type: "external-wallet",
                    address: "0xAdminSignerAddress123456789012345678901234",
                },
                signers: [
                    {
                        type: "server",
                        secret: TEST_SECRET,
                    },
                ],
            };

            await walletFactory.createWallet(args);

            expect(mockApiClient.createWallet).toHaveBeenCalledWith(
                expect.objectContaining({
                    config: expect.objectContaining({
                        delegatedSigners: expect.arrayContaining([
                            expect.objectContaining({ signer: `server:${derivedAddress}` }),
                        ]),
                    }),
                })
            );
        });
    });

    describe("getWallet with server signer", () => {
        it("returns a wallet when API returns server admin signer type", async () => {
            mockApiClient.getWallet.mockResolvedValue(mockServerWalletResponse);

            const args: WalletArgsFor<"base-sepolia"> = {
                chain: "base-sepolia",
            };

            await expect(walletFactory.getWallet(mockServerWalletResponse.address, args)).resolves.toBeDefined();
        });
    });
});

describe("WalletFactory - recovery signer lists", () => {
    let walletFactory: WalletFactory;
    let mockApiClient: MockedApiClient;

    const PROJECT_ID = "test-project";
    const ENVIRONMENT = APIKeyEnvironmentPrefix.STAGING;
    const FIRST_SERVER_SECRET = "a".repeat(64);
    const SECOND_SERVER_SECRET = "b".repeat(64);
    const SOLANA_ADDRESS = "9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM";
    const STELLAR_ADDRESS = "GA6HCMBLTZS5VYYBCATRBRZ3BZJMAFUDKYYF6RBM4CFTJKZUZWFRTIYT";
    const EXTERNAL_WALLET_ADDRESS = "ExternalWalletRecoveryAddress123";

    const derivedServerAddress = (secret: string, chain: "solana" | "stellar") =>
        deriveServerSignerDetails({ type: "server", secret }, chain, PROJECT_ID, ENVIRONMENT).derivedAddress;

    const walletResponseWithRecovery = (
        chainType: "solana" | "stellar",
        address: string,
        recovery: Array<Record<string, unknown>>
    ) =>
        ({
            chainType,
            type: "smart" as const,
            address,
            owner: "test-owner",
            config: { adminSigner: recovery[0], recovery },
            createdAt: Date.now(),
        }) as unknown as GetWalletSuccessResponse;

    beforeEach(() => {
        vi.resetAllMocks();

        mockApiClient = {
            isServerSide: true,
            crossmint: { projectId: PROJECT_ID },
            projectId: PROJECT_ID,
            environment: ENVIRONMENT,
            getWallet: vi.fn(),
            createWallet: vi.fn(),
        };

        walletFactory = new WalletFactory(mockApiClient as unknown as ApiClient);
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    describe("createWallet request", () => {
        it("sends a Solana recovery list under config.recovery and never alongside adminSigner", async () => {
            const recovery = [
                { type: "email" as const, email: "recovery@example.com" },
                { type: "external-wallet" as const, address: EXTERNAL_WALLET_ADDRESS },
            ];
            mockApiClient.createWallet.mockResolvedValue(
                walletResponseWithRecovery("solana", SOLANA_ADDRESS, recovery)
            );

            await walletFactory.createWallet({ chain: "solana", recovery });

            const createWalletParams = mockApiClient.createWallet.mock.calls[0][0];
            expect(createWalletParams.config).toEqual(expect.objectContaining({ recovery }));
            expect(createWalletParams.config).not.toHaveProperty("adminSigner");
        });

        it("sends a Stellar recovery list under config.recovery", async () => {
            const recovery = [
                { type: "api-key" as const },
                { type: "phone" as const, phone: "+15550000001", channel: "sms" as const },
            ];
            mockApiClient.createWallet.mockResolvedValue(
                walletResponseWithRecovery("stellar", STELLAR_ADDRESS, recovery)
            );

            await walletFactory.createWallet({ chain: "stellar", recovery });

            expect(mockApiClient.createWallet).toHaveBeenCalledWith(
                expect.objectContaining({ config: expect.objectContaining({ recovery }) })
            );
        });

        it("keeps sending a single recovery signer under the deprecated adminSigner field", async () => {
            const recovery = { type: "email" as const, email: "recovery@example.com" };
            mockApiClient.createWallet.mockResolvedValue(
                walletResponseWithRecovery("solana", SOLANA_ADDRESS, [recovery])
            );

            await walletFactory.createWallet({ chain: "solana", recovery });

            const createWalletParams = mockApiClient.createWallet.mock.calls[0][0];
            expect(createWalletParams.config).toEqual(expect.objectContaining({ adminSigner: recovery }));
            expect(createWalletParams.config).not.toHaveProperty("recovery");
        });

        it("derives an address for every server signer in the list", async () => {
            const firstAddress = derivedServerAddress(FIRST_SERVER_SECRET, "solana");
            const secondAddress = derivedServerAddress(SECOND_SERVER_SECRET, "solana");
            mockApiClient.createWallet.mockResolvedValue(
                walletResponseWithRecovery("solana", SOLANA_ADDRESS, [
                    { type: "server", address: firstAddress, locator: `server:${firstAddress}` },
                    { type: "server", address: secondAddress, locator: `server:${secondAddress}` },
                ])
            );

            await walletFactory.createWallet({
                chain: "solana",
                recovery: [
                    { type: "server", secret: FIRST_SERVER_SECRET },
                    { type: "server", secret: SECOND_SERVER_SECRET },
                ],
            });

            expect(mockApiClient.createWallet).toHaveBeenCalledWith(
                expect.objectContaining({
                    config: expect.objectContaining({
                        recovery: [
                            { type: "server", address: firstAddress },
                            { type: "server", address: secondAddress },
                        ],
                    }),
                })
            );
        });

        it("creates a credential for every passkey signer in the list that has no id", async () => {
            const onCreatePasskey = vi.fn().mockImplementation(async (name: string) => ({
                id: `credential-for-${name}`,
                publicKey: { x: 1n, y: 2n },
            }));
            // Passkeys are only a valid signer type on EVM, which is still single-recovery, so the list is cast:
            // this asserts the factory resolves every entry rather than only the first one.
            const recovery = [
                { type: "passkey", name: "first", onCreatePasskey },
                { type: "passkey", name: "second", onCreatePasskey },
            ] as unknown as WalletCreateArgs<"solana">["recovery"];
            mockApiClient.createWallet.mockResolvedValue(
                walletResponseWithRecovery("solana", SOLANA_ADDRESS, [
                    { type: "passkey", id: "credential-for-first" },
                    { type: "passkey", id: "credential-for-second" },
                ])
            );

            await walletFactory.createWallet({ chain: "solana", recovery });

            expect(onCreatePasskey).toHaveBeenCalledTimes(2);
            expect(mockApiClient.createWallet).toHaveBeenCalledWith(
                expect.objectContaining({
                    config: expect.objectContaining({
                        recovery: [
                            expect.objectContaining({ type: "passkey", id: "credential-for-first", name: "first" }),
                            expect.objectContaining({ type: "passkey", id: "credential-for-second", name: "second" }),
                        ],
                    }),
                })
            );
        });
    });

    describe("createWallet validation", () => {
        it("rejects a recovery list on a chain that only supports one recovery signer", async () => {
            const recovery = [{ type: "api-key" as const }, { type: "api-key" as const }];

            await expect(
                walletFactory.createWallet({
                    chain: "base-sepolia",
                    recovery: recovery as unknown as WalletCreateArgs<"base-sepolia">["recovery"],
                })
            ).rejects.toBeInstanceOf(RecoveryNotSupportedOnChainError);
            expect(mockApiClient.createWallet).not.toHaveBeenCalled();
        });

        it("rejects an empty recovery list without calling the API", async () => {
            await expect(walletFactory.createWallet({ chain: "solana", recovery: [] })).rejects.toBeInstanceOf(
                InvalidRecoveryConfigError
            );
            expect(mockApiClient.createWallet).not.toHaveBeenCalled();
        });

        it("rejects a recovery list above the signer cap without calling the API", async () => {
            const recovery = Array.from({ length: MAX_RECOVERY_SIGNERS + 1 }, (_, index) => ({
                type: "email" as const,
                email: `recovery-${index}@example.com`,
            }));

            await expect(walletFactory.createWallet({ chain: "solana", recovery })).rejects.toBeInstanceOf(
                RecoverySignerLimitExceededError
            );
            expect(mockApiClient.createWallet).not.toHaveBeenCalled();
        });

        it("maps recovery error codes returned by the API to typed SDK errors", async () => {
            mockApiClient.createWallet.mockResolvedValue({
                error: true,
                code: "RECOVERY_DUPLICATE_SIGNER",
                message: "duplicate admin signer",
            } as unknown as GetWalletSuccessResponse);

            await expect(
                walletFactory.createWallet({
                    chain: "solana",
                    recovery: [
                        { type: "email", email: "recovery@example.com" },
                        { type: "email", email: "recovery@example.com" },
                    ],
                })
            ).rejects.toBeInstanceOf(DuplicateRecoverySignerError);
        });
    });

    describe("createWallet response", () => {
        it("exposes every recovery signer from the response as wallet.recoverySigners", async () => {
            const recovery = [
                { type: "email" as const, email: "recovery@example.com" },
                { type: "external-wallet" as const, address: EXTERNAL_WALLET_ADDRESS },
            ];
            mockApiClient.createWallet.mockResolvedValue(
                walletResponseWithRecovery("solana", SOLANA_ADDRESS, [
                    { ...recovery[0], locator: "email:recovery@example.com" },
                    { ...recovery[1], locator: `external-wallet:${EXTERNAL_WALLET_ADDRESS}` },
                ])
            );

            const wallet = await walletFactory.createWallet({ chain: "solana", recovery });

            expect(wallet.recoverySigners).toHaveLength(2);
            expect(wallet.recoverySigners.map((signer) => signer.type)).toEqual(["email", "external-wallet"]);
        });

        it("keeps the caller's server signer config for the matching entry of the recovery list", async () => {
            const firstAddress = derivedServerAddress(FIRST_SERVER_SECRET, "solana");
            mockApiClient.createWallet.mockResolvedValue(
                walletResponseWithRecovery("solana", SOLANA_ADDRESS, [
                    { type: "api-key" },
                    { type: "server", address: firstAddress, locator: `server:${firstAddress}` },
                ])
            );

            const wallet = await walletFactory.createWallet({
                chain: "solana",
                recovery: [{ type: "api-key" }, { type: "server", secret: FIRST_SERVER_SECRET }],
            });

            expect(wallet.recoverySigners[1]).toEqual({ type: "server", secret: FIRST_SERVER_SECRET });
        });

        it("falls back to the deprecated adminSigner for responses without a recovery list", async () => {
            const adminSigner = {
                type: "external-wallet" as const,
                address: EXTERNAL_WALLET_ADDRESS,
                locator: `external-wallet:${EXTERNAL_WALLET_ADDRESS}`,
            };
            mockApiClient.getWallet.mockResolvedValue({
                chainType: "solana" as const,
                type: "smart" as const,
                address: SOLANA_ADDRESS,
                owner: "test-owner",
                config: { adminSigner },
                createdAt: Date.now(),
            } as unknown as GetWalletSuccessResponse);

            const wallet = await walletFactory.getWallet(SOLANA_ADDRESS, { chain: "solana" });

            expect(wallet.recoverySigners).toEqual([adminSigner]);
        });
    });
});
