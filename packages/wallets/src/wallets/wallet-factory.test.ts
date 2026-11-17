import { afterEach, beforeEach, describe, expect, it, vi, type MockedFunction } from "vitest";
import { WalletFactory } from "./wallet-factory";
import {
    DuplicateRecoverySignerError,
    InvalidChainError,
    InvalidEnvironmentError,
    InvalidRecoveryConfigError,
    WalletCreationError,
} from "../utils/errors";
import { walletsLogger } from "../logger";
import type { ApiClient, GetWalletSuccessResponse } from "../api";
import type { WalletArgsFor, WalletCreateArgs } from "./types";
import { APIKeyEnvironmentPrefix } from "@crossmint/common-sdk-base";
import { deriveServerSignerDetails } from "../signers/server";
import {
    QUORUM_SERVER_MEMBER_SECRET,
    createQuorumApiEntry,
    createQuorumFixture,
    withMembersReordered,
} from "./__tests__/test-helpers";

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

    const evmWalletWithRecovery = (recoveryMethods: Array<Record<string, unknown>>) =>
        ({
            chainType: "evm",
            type: "smart",
            address: "0x1234567890123456789012345678901234567890",
            owner: "test-owner",
            config: { adminSigner: recoveryMethods[0], recoveryMethods, delegatedSigners: [] },
            createdAt: Date.now(),
        }) as unknown as GetWalletSuccessResponse;

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

    describe("createWallet recovery methods", () => {
        it("creates a wallet with a single recovery method under adminSigner", async () => {
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

        it("creates a Solana wallet with recovery methods under recoveryMethods", async () => {
            const recoveryMethods = [
                { type: "external-wallet" as const, address: "AdminSignerAddress123" },
                { type: "external-wallet" as const, address: "SecondSignerAddress456" },
            ];
            mockApiClient.createWallet.mockResolvedValue({
                ...mockWalletWithAdminAndDelegated,
                config: {
                    ...mockWalletWithAdminAndDelegated.config,
                    recoveryMethods,
                },
            });

            await walletFactory.createWallet({ chain: "solana", recoveryMethods });

            expect(mockApiClient.createWallet).toHaveBeenCalledWith(
                expect.objectContaining({
                    config: expect.objectContaining({ recoveryMethods }),
                })
            );
        });

        it("creates a wallet with recovery under adminSigner", async () => {
            mockApiClient.createWallet.mockResolvedValue(mockWalletWithAdminAndDelegated);

            await walletFactory.createWallet({
                chain: "solana",
                recovery: {
                    type: "external-wallet",
                    address: "AdminSignerAddress123",
                },
            });

            expect(mockApiClient.createWallet).toHaveBeenCalledWith(
                expect.objectContaining({
                    config: expect.objectContaining({
                        adminSigner: expect.objectContaining({ address: "AdminSignerAddress123" }),
                    }),
                })
            );
        });

        it("rejects both recovery configuration keys", async () => {
            await expect(
                walletFactory.createWallet({
                    chain: "solana",
                    recoveryMethods: [{ type: "api-key" }],
                    recovery: { type: "api-key" },
                })
            ).rejects.toBeInstanceOf(InvalidRecoveryConfigError);
            expect(mockApiClient.createWallet).not.toHaveBeenCalled();
        });

        it("rejects wallet creation without a recovery configuration", async () => {
            await expect(walletFactory.createWallet({ chain: "solana" })).rejects.toThrow(
                new InvalidRecoveryConfigError("A recovery method is required")
            );
            expect(mockApiClient.createWallet).not.toHaveBeenCalled();
        });

        it("rejects an empty recoveryMethods array", async () => {
            await expect(walletFactory.createWallet({ chain: "solana", recoveryMethods: [] })).rejects.toThrow(
                new InvalidRecoveryConfigError("At least one recovery method is required")
            );
            expect(mockApiClient.createWallet).not.toHaveBeenCalled();
        });

        it("sends a single recoveryMethods entry on EVM under recoveryMethods", async () => {
            mockApiClient.createWallet.mockResolvedValue(evmWalletWithRecovery([{ type: "api-key" }]));

            await walletFactory.createWallet({
                chain: "base-sepolia",
                recoveryMethods: [{ type: "api-key" }],
            });

            const [createWalletParams] = mockApiClient.createWallet.mock.calls[0];
            expect(createWalletParams.config).toEqual(
                expect.objectContaining({ recoveryMethods: [{ type: "api-key" }] })
            );
            expect(createWalletParams.config).not.toHaveProperty("adminSigner");
        });

        it("routes the deprecated recovery list form to config.recoveryMethods on Solana", async () => {
            const recovery = [{ type: "api-key" as const }, { type: "email" as const, email: "user@example.com" }];
            mockApiClient.createWallet.mockResolvedValue({
                ...mockWalletWithAdminAndDelegated,
                config: { recoveryMethods: recovery },
            } as unknown as GetWalletSuccessResponse);

            await walletFactory.createWallet({ chain: "solana", recovery });

            const [createWalletParams] = mockApiClient.createWallet.mock.calls[0];
            expect(createWalletParams.config).toEqual(expect.objectContaining({ recoveryMethods: recovery }));
            expect(createWalletParams.config).not.toHaveProperty("adminSigner");
        });

        it("routes the deprecated recovery list form to config.recoveryMethods on EVM", async () => {
            const recovery = [{ type: "api-key" as const }, { type: "email" as const, email: "user@example.com" }];
            mockApiClient.createWallet.mockResolvedValue(evmWalletWithRecovery(recovery));

            await walletFactory.createWallet({ chain: "base-sepolia", recovery });

            const [createWalletParams] = mockApiClient.createWallet.mock.calls[0];
            expect(createWalletParams.config).toEqual(expect.objectContaining({ recoveryMethods: recovery }));
            expect(createWalletParams.config).not.toHaveProperty("adminSigner");
        });

        it("rejects an empty deprecated recovery list as empty", async () => {
            await expect(walletFactory.createWallet({ chain: "solana", recovery: [] })).rejects.toThrow(
                InvalidRecoveryConfigError
            );
            expect(mockApiClient.createWallet).not.toHaveBeenCalled();
        });

        it("rejects a non-array recoveryMethods before calling the API", async () => {
            const args = {
                chain: "solana",
                recoveryMethods: { type: "api-key" },
            } as unknown as WalletCreateArgs<"solana">;

            await expect(walletFactory.createWallet(args)).rejects.toBeInstanceOf(InvalidRecoveryConfigError);
            expect(mockApiClient.createWallet).not.toHaveBeenCalled();
        });

        it("creates an EVM wallet with recovery methods under recoveryMethods", async () => {
            const recoveryMethods = [
                { type: "api-key" as const },
                { type: "external-wallet" as const, address: "0x0000000000000000000000000000000000000456" },
            ];
            mockApiClient.createWallet.mockResolvedValue(evmWalletWithRecovery(recoveryMethods));

            const wallet = await walletFactory.createWallet({ chain: "base-sepolia", recoveryMethods });

            const [createWalletParams] = mockApiClient.createWallet.mock.calls[0];
            expect(createWalletParams.config).toEqual(expect.objectContaining({ recoveryMethods }));
            expect(createWalletParams.config).not.toHaveProperty("adminSigner");
            expect(wallet.recoveryMethods).toHaveLength(2);
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
            config: { adminSigner: recovery[0], recoveryMethods: recovery },
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
        it("sends a Solana recovery list under config.recoveryMethods and never alongside adminSigner", async () => {
            const recovery = [
                { type: "email" as const, email: "recovery@example.com" },
                { type: "external-wallet" as const, address: EXTERNAL_WALLET_ADDRESS },
            ];
            mockApiClient.createWallet.mockResolvedValue(
                walletResponseWithRecovery("solana", SOLANA_ADDRESS, recovery)
            );

            await walletFactory.createWallet({ chain: "solana", recoveryMethods: recovery });

            const createWalletParams = mockApiClient.createWallet.mock.calls[0][0];
            expect(createWalletParams.config).toEqual(expect.objectContaining({ recoveryMethods: recovery }));
            expect(createWalletParams.config).not.toHaveProperty("adminSigner");
        });

        it("sends a Stellar recovery list under config.recoveryMethods", async () => {
            const recovery = [
                { type: "api-key" as const },
                { type: "phone" as const, phone: "+15550000001", channel: "sms" as const },
            ];
            mockApiClient.createWallet.mockResolvedValue(
                walletResponseWithRecovery("stellar", STELLAR_ADDRESS, recovery)
            );

            await walletFactory.createWallet({ chain: "stellar", recoveryMethods: recovery });

            expect(mockApiClient.createWallet).toHaveBeenCalledWith(
                expect.objectContaining({ config: expect.objectContaining({ recoveryMethods: recovery }) })
            );
        });

        it("sends a single recovery method under the adminSigner field", async () => {
            const recovery = { type: "email" as const, email: "recovery@example.com" };
            mockApiClient.createWallet.mockResolvedValue(
                walletResponseWithRecovery("solana", SOLANA_ADDRESS, [recovery])
            );

            await walletFactory.createWallet({ chain: "solana", recovery });

            const createWalletParams = mockApiClient.createWallet.mock.calls[0][0];
            expect(createWalletParams.config).toEqual(expect.objectContaining({ adminSigner: recovery }));
            expect(createWalletParams.config).not.toHaveProperty("recoveryMethods");
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
                recoveryMethods: [
                    { type: "server", secret: FIRST_SERVER_SECRET },
                    { type: "server", secret: SECOND_SERVER_SECRET },
                ],
            });

            expect(mockApiClient.createWallet).toHaveBeenCalledWith(
                expect.objectContaining({
                    config: expect.objectContaining({
                        recoveryMethods: [
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
            ] as unknown as WalletCreateArgs<"solana">["recoveryMethods"];
            mockApiClient.createWallet.mockResolvedValue(
                walletResponseWithRecovery("solana", SOLANA_ADDRESS, [
                    { type: "passkey", id: "credential-for-first" },
                    { type: "passkey", id: "credential-for-second" },
                ])
            );

            await walletFactory.createWallet({ chain: "solana", recoveryMethods: recovery });

            expect(onCreatePasskey).toHaveBeenCalledTimes(2);
            expect(mockApiClient.createWallet).toHaveBeenCalledWith(
                expect.objectContaining({
                    config: expect.objectContaining({
                        recoveryMethods: [
                            expect.objectContaining({ type: "passkey", id: "credential-for-first", name: "first" }),
                            expect.objectContaining({ type: "passkey", id: "credential-for-second", name: "second" }),
                        ],
                    }),
                })
            );
        });
    });

    describe("createWallet with a passkeyProvider", () => {
        it("creates signers that prompt the user one at a time, since the platform shows one dialog at once", async () => {
            let inFlight = 0;
            let maxInFlight = 0;
            const prompting =
                <T>(run: () => Promise<T>) =>
                async () => {
                    inFlight++;
                    maxInFlight = Math.max(maxInFlight, inFlight);
                    await new Promise((resolve) => setTimeout(resolve, 5));
                    inFlight--;
                    return await run();
                };
            const passkeyProvider = {
                createPasskey: vi.fn(
                    prompting(async () => ({ id: "native-credential", publicKey: { x: "1", y: "2" } }))
                ),
                signWithPasskey: vi.fn(),
            };
            // With key storage, the factory also adds a device signer, whose key creation can prompt for biometrics.
            const devicePublicKey = Buffer.from([0x04, ...new Array(64).fill(1)]).toString("base64");
            const deviceSignerKeyStorage = {
                getKey: vi.fn().mockResolvedValue(null),
                generateKey: vi.fn(prompting(async () => devicePublicKey)),
                getDeviceName: vi.fn().mockReturnValue("iPhone"),
            };
            const response = walletResponseWithRecovery("solana", SOLANA_ADDRESS, [{ type: "api-key" }]);
            mockApiClient.createWallet.mockResolvedValue({
                ...response,
                config: {
                    ...(response as unknown as { config: object }).config,
                    delegatedSigners: [
                        {
                            type: "passkey",
                            id: "native-credential",
                            name: "My passkey",
                            publicKey: { x: "1", y: "2" },
                            locator: "passkey:native-credential",
                        },
                    ],
                },
            } as unknown as GetWalletSuccessResponse);

            await walletFactory.createWallet({
                chain: "solana",
                recoveryMethods: [{ type: "api-key" }],
                signers: [{ type: "passkey", name: "My passkey" }],
                options: { passkeyProvider, deviceSignerKeyStorage: deviceSignerKeyStorage as unknown as any },
            });

            expect(passkeyProvider.createPasskey).toHaveBeenCalledTimes(1);
            expect(deviceSignerKeyStorage.generateKey).toHaveBeenCalledTimes(1);
            expect(maxInFlight).toBe(1);
        });

        it("creates passkey signers that have no onCreatePasskey through the provider", async () => {
            const passkeyProvider = {
                createPasskey: vi.fn().mockResolvedValue({ id: "native-credential", publicKey: { x: "1", y: "2" } }),
                signWithPasskey: vi.fn(),
            };
            const response = walletResponseWithRecovery("solana", SOLANA_ADDRESS, [{ type: "api-key" }]);
            mockApiClient.createWallet.mockResolvedValue({
                ...response,
                config: {
                    ...(response as unknown as { config: object }).config,
                    delegatedSigners: [
                        {
                            type: "passkey",
                            id: "native-credential",
                            name: "My passkey",
                            publicKey: { x: "1", y: "2" },
                            locator: "passkey:native-credential",
                        },
                    ],
                },
            } as unknown as GetWalletSuccessResponse);

            await walletFactory.createWallet({
                chain: "solana",
                recoveryMethods: [{ type: "api-key" }],
                signers: [{ type: "passkey", name: "My passkey" }],
                options: { passkeyProvider },
            });

            expect(passkeyProvider.createPasskey).toHaveBeenCalledWith("My passkey");
            expect(mockApiClient.createWallet).toHaveBeenCalledWith(
                expect.objectContaining({
                    config: expect.objectContaining({
                        delegatedSigners: [
                            expect.objectContaining({
                                signer: expect.objectContaining({
                                    type: "passkey",
                                    id: "native-credential",
                                    publicKey: { x: "1", y: "2" },
                                }),
                            }),
                        ],
                    }),
                })
            );
        });
    });

    describe("createWallet validation", () => {
        it("rejects an empty recovery list without calling the API", async () => {
            await expect(walletFactory.createWallet({ chain: "solana", recoveryMethods: [] })).rejects.toBeInstanceOf(
                InvalidRecoveryConfigError
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
                    recoveryMethods: [
                        { type: "email", email: "recovery@example.com" },
                        { type: "email", email: "recovery@example.com" },
                    ],
                })
            ).rejects.toBeInstanceOf(DuplicateRecoverySignerError);
        });
    });

    describe("getWallet with the caller's recovery config", () => {
        it("keeps the phone channel, which the API never returns, on an existing wallet", async () => {
            const phone = "+15550000001";
            mockApiClient.isServerSide = false;
            mockApiClient.getWallet.mockResolvedValue(
                walletResponseWithRecovery("solana", SOLANA_ADDRESS, [
                    { type: "phone", phone, locator: `phone:${phone}` },
                ])
            );

            const withoutRecovery = await walletFactory.getWallet({ chain: "solana" });
            const withRecovery = await walletFactory.getWallet({
                chain: "solana",
                recovery: { type: "phone", phone, channel: "whatsapp" },
            } as WalletCreateArgs<"solana">);

            expect(withoutRecovery.recoveryMethods[0]).not.toHaveProperty("channel");
            expect(withRecovery.recoveryMethods[0]).toEqual(
                expect.objectContaining({ type: "phone", channel: "whatsapp" })
            );
        });

        it("accepts a server recovery secret that derives to the existing wallet's server signer address", async () => {
            const firstAddress = derivedServerAddress(FIRST_SERVER_SECRET, "solana");
            mockApiClient.getWallet.mockResolvedValue(
                walletResponseWithRecovery("solana", SOLANA_ADDRESS, [
                    { type: "server", address: firstAddress, locator: `server:${firstAddress}` },
                ])
            );

            await expect(
                walletFactory.getWallet(SOLANA_ADDRESS, {
                    chain: "solana",
                    recovery: { type: "server", secret: FIRST_SERVER_SECRET },
                } as WalletCreateArgs<"solana">)
            ).resolves.toBeDefined();
        });

        it("rejects a server recovery secret that derives to a different address, without echoing it", async () => {
            const firstAddress = derivedServerAddress(FIRST_SERVER_SECRET, "solana");
            mockApiClient.getWallet.mockResolvedValue(
                walletResponseWithRecovery("solana", SOLANA_ADDRESS, [
                    { type: "server", address: firstAddress, locator: `server:${firstAddress}` },
                ])
            );

            const result = walletFactory.getWallet(SOLANA_ADDRESS, {
                chain: "solana",
                recovery: { type: "server", secret: SECOND_SERVER_SECRET },
            } as WalletCreateArgs<"solana">);

            await expect(result).rejects.toBeInstanceOf(WalletCreationError);
            await expect(result).rejects.toThrow(/derives to a different address/);
            const message = await result.catch((error: Error) => error.message);
            expect(message).not.toContain(SECOND_SERVER_SECRET);
            expect(message).not.toContain(FIRST_SERVER_SECRET);
        });
    });

    describe("createWallet response", () => {
        it("exposes every recovery signer from the response as wallet.recoveryMethods", async () => {
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

            const wallet = await walletFactory.createWallet({ chain: "solana", recoveryMethods: recovery });

            expect(wallet.recoveryMethods).toHaveLength(2);
            expect(wallet.recoveryMethods.map((signer) => signer.type)).toEqual(["email", "external-wallet"]);
        });

        it("exposes the caller's server recovery signer address-only, never its secret", async () => {
            const firstAddress = derivedServerAddress(FIRST_SERVER_SECRET, "solana");
            mockApiClient.createWallet.mockResolvedValue(
                walletResponseWithRecovery("solana", SOLANA_ADDRESS, [
                    { type: "api-key" },
                    { type: "server", address: firstAddress, locator: `server:${firstAddress}` },
                ])
            );

            const wallet = await walletFactory.createWallet({
                chain: "solana",
                recoveryMethods: [{ type: "api-key" }, { type: "server", secret: FIRST_SERVER_SECRET }],
            });

            expect(wallet.recoveryMethods[1]).toEqual({ type: "server", address: firstAddress });
            expect(JSON.stringify(wallet.recoveryMethods)).not.toContain(FIRST_SERVER_SECRET);
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

            expect(wallet.recoveryMethods).toEqual([adminSigner]);
        });
    });
});

describe("WalletFactory - recovery configuration rejected before any side effect", () => {
    let walletFactory: WalletFactory;
    let mockApiClient: MockedApiClient;

    const SOLANA_ADDRESS = "9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM";
    const EVM_ADDRESS = "0x1234567890123456789012345678901234567890";
    const email = { type: "email" as const, email: "recovery@example.com" };
    const secondEmail = { type: "email" as const, email: "second@example.com" };

    const existingWallet = (chainType: "solana" | "evm", address: string) =>
        ({
            chainType,
            type: "smart" as const,
            address,
            owner: "test-owner",
            config: { adminSigner: email, recoveryMethods: [email] },
            createdAt: Date.now(),
        }) as unknown as GetWalletSuccessResponse;

    beforeEach(() => {
        vi.resetAllMocks();
        mockApiClient = {
            isServerSide: true,
            crossmint: { projectId: "test-project" },
            projectId: "test-project",
            environment: APIKeyEnvironmentPrefix.STAGING,
            getWallet: vi.fn(),
            createWallet: vi.fn(),
        };
        walletFactory = new WalletFactory(mockApiClient as unknown as ApiClient);
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    describe("createWallet with a signer type that cannot recover a wallet", () => {
        it("rejects a device signer as the recovery method without calling the API", async () => {
            await expect(
                walletFactory.createWallet({ chain: "solana", recovery: { type: "device" } } as never)
            ).rejects.toThrow(InvalidRecoveryConfigError);

            expect(mockApiClient.createWallet).not.toHaveBeenCalled();
        });

        it("rejects a device signer inside a recovery list", async () => {
            await expect(
                walletFactory.createWallet({
                    chain: "solana",
                    recoveryMethods: [email, { type: "device" }],
                } as never)
            ).rejects.toThrow(/"device" signer cannot be a recovery method on solana/);

            expect(mockApiClient.createWallet).not.toHaveBeenCalled();
        });

        it("rejects before onWalletCreationStart fires or any signer is registered", async () => {
            const onWalletCreationStart = vi.fn();
            const deviceSignerKeyStorage = { generateKey: vi.fn(), getKey: vi.fn(), signMessage: vi.fn() };

            await expect(
                walletFactory.createWallet({
                    chain: "solana",
                    recovery: { type: "device" },
                    signers: [{ type: "device" }],
                    options: {
                        callbacks: { onWalletCreationStart },
                        deviceSignerKeyStorage: deviceSignerKeyStorage as never,
                    },
                } as never)
            ).rejects.toThrow(InvalidRecoveryConfigError);

            expect(onWalletCreationStart).not.toHaveBeenCalled();
            expect(deviceSignerKeyStorage.generateKey).not.toHaveBeenCalled();
        });
    });

    describe("getWallet applies the same recovery rules as createWallet", () => {
        it("rejects an empty recovery list instead of treating it as no configuration", async () => {
            await expect(
                walletFactory.getWallet(SOLANA_ADDRESS, { chain: "solana", recoveryMethods: [] } as never)
            ).rejects.toThrow(InvalidRecoveryConfigError);

            expect(mockApiClient.getWallet).not.toHaveBeenCalled();
        });

        it("loads an EVM wallet with more than one recovery method", async () => {
            mockApiClient.getWallet.mockResolvedValue({
                ...existingWallet("evm", EVM_ADDRESS),
                config: { adminSigner: email, recoveryMethods: [email, secondEmail] },
            } as unknown as GetWalletSuccessResponse);

            const wallet = await walletFactory.getWallet(EVM_ADDRESS, {
                chain: "base-sepolia",
                recoveryMethods: [email, secondEmail],
            } as never);

            expect(wallet.address).toBe(EVM_ADDRESS);
            expect(wallet.recoveryMethods).toEqual([email, secondEmail]);
        });

        it("rejects a device signer as the recovery method", async () => {
            await expect(
                walletFactory.getWallet(SOLANA_ADDRESS, { chain: "solana", recovery: { type: "device" } } as never)
            ).rejects.toThrow(InvalidRecoveryConfigError);

            expect(mockApiClient.getWallet).not.toHaveBeenCalled();
        });

        it("loads the wallet as before when no recovery configuration is passed", async () => {
            mockApiClient.getWallet.mockResolvedValue(existingWallet("solana", SOLANA_ADDRESS));

            const wallet = await walletFactory.getWallet(SOLANA_ADDRESS, { chain: "solana" });

            expect(wallet.address).toBe(SOLANA_ADDRESS);
            expect(mockApiClient.getWallet).toHaveBeenCalledTimes(1);
        });

        it("loads the wallet when the recovery configuration is valid and matches", async () => {
            mockApiClient.getWallet.mockResolvedValue(existingWallet("solana", SOLANA_ADDRESS));

            const wallet = await walletFactory.getWallet(SOLANA_ADDRESS, { chain: "solana", recovery: email } as never);

            expect(wallet.address).toBe(SOLANA_ADDRESS);
        });
    });

    describe("createWallet with an explicit device signer and no key storage", () => {
        it("fails at configuration time, before the API is called", async () => {
            await expect(
                walletFactory.createWallet({
                    chain: "solana",
                    recovery: email,
                    signers: [{ type: "device" }],
                })
            ).rejects.toThrow(WalletCreationError);

            await expect(
                walletFactory.createWallet({
                    chain: "solana",
                    recovery: email,
                    signers: [{ type: "device" }],
                })
            ).rejects.toThrow("Device signer key storage is required for device signers");

            expect(mockApiClient.createWallet).not.toHaveBeenCalled();
        });
    });
});

describe("WalletFactory - quorum entries", () => {
    let walletFactory: WalletFactory;
    let mockApiClient: MockedApiClient & { getSigner: MockedFunction<ApiClient["getSigner"]> };

    const ADDRESSES = {
        evm: "0x1234567890123456789012345678901234567890",
        solana: "9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM",
        stellar: "GA6HCMBLTZS5VYYBCATRBRZ3BZJMAFUDKYYF6RBM4CFTJKZUZWFRTIYT",
    } as const;
    const EXTERNAL_WALLET_ADDRESS = "ExternalWalletRecoveryAddress123";

    const walletResponse = (chainType: keyof typeof ADDRESSES, config: Record<string, unknown>) =>
        ({
            chainType,
            type: "smart" as const,
            address: ADDRESSES[chainType],
            owner: "test-owner",
            config,
            createdAt: Date.now(),
        }) as unknown as GetWalletSuccessResponse;

    beforeEach(() => {
        vi.resetAllMocks();
        mockApiClient = {
            isServerSide: false,
            crossmint: { projectId: "test-project" },
            projectId: "test-project",
            environment: APIKeyEnvironmentPrefix.STAGING,
            getWallet: vi.fn(),
            createWallet: vi.fn(),
            getSigner: vi.fn(),
        };
        walletFactory = new WalletFactory(mockApiClient as unknown as ApiClient);
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    describe.each([
        { chain: "base-sepolia", chainType: "evm" },
        { chain: "solana", chainType: "solana" },
        { chain: "stellar", chainType: "stellar" },
    ] as const)("when the only recovery method of a $chain wallet is a quorum", ({ chain, chainType }) => {
        it("loads the wallet with the quorum as its recovery method and no default signer", async () => {
            const quorum = createQuorumApiEntry();
            mockApiClient.getWallet.mockResolvedValue(
                walletResponse(chainType, { adminSigner: quorum, recoveryMethods: [quorum] })
            );

            const wallet = await walletFactory.getWallet({ chain });

            expect(wallet.recoveryMethods).toEqual([quorum]);
            expect(wallet.signer).toBeUndefined();
        });
    });

    describe.each([
        { chain: "base-sepolia", chainType: "evm" },
        { chain: "solana", chainType: "solana" },
        { chain: "stellar", chainType: "stellar" },
    ] as const)(
        "when a $chain response carries the quorum only in the deprecated adminSigner field",
        ({ chain, chainType }) => {
            it("reads it as the wallet's only recovery method", async () => {
                const quorum = createQuorumApiEntry();
                mockApiClient.getWallet.mockResolvedValue(walletResponse(chainType, { adminSigner: quorum }));

                const wallet = await walletFactory.getWallet({ chain });

                expect(wallet.recoveryMethods).toEqual([quorum]);
            });
        }
    );

    describe("when a quorum comes before an external-wallet recovery method the caller holds", () => {
        it("keeps the quorum as returned and makes the external wallet the default signer", async () => {
            const quorum = createQuorumApiEntry();
            const externalWallet = {
                type: "external-wallet",
                address: EXTERNAL_WALLET_ADDRESS,
                locator: `external-wallet:${EXTERNAL_WALLET_ADDRESS}`,
            };
            mockApiClient.getWallet.mockResolvedValue(
                walletResponse("solana", { adminSigner: quorum, recoveryMethods: [quorum, externalWallet] })
            );

            const wallet = await walletFactory.getWallet({
                chain: "solana",
                recovery: { type: "external-wallet", address: EXTERNAL_WALLET_ADDRESS, onSign: vi.fn() },
            } as WalletCreateArgs<"solana">);

            expect(wallet.recoveryMethods[0]).toEqual(quorum);
            expect(wallet.recoveryMethods[1]).toEqual(expect.objectContaining({ onSign: expect.any(Function) }));
            expect(wallet.signer?.type).toBe("external-wallet");
            // Assembled as a recovery (admin) signer: active without asking the API for its status.
            expect(wallet.signer?.status).toBe("active");
            expect(mockApiClient.getSigner).not.toHaveBeenCalled();
        });
    });

    describe("when the wallet has two recovery quorums", () => {
        it("keeps both, each with its own locator", async () => {
            const first = createQuorumApiEntry();
            const second = createQuorumApiEntry({ threshold: 3, memberCount: 4 });
            mockApiClient.getWallet.mockResolvedValue(
                walletResponse("stellar", { adminSigner: first, recoveryMethods: [first, second] })
            );

            const wallet = await walletFactory.getWallet({ chain: "stellar" });

            expect(wallet.recoveryMethods).toEqual([first, second]);
        });
    });

    describe("when the caller passes a quorum member as the recovery config", () => {
        it("rejects with WalletCreationError, as for any recovery mismatch", async () => {
            const quorum = createQuorumApiEntry();
            mockApiClient.getWallet.mockResolvedValue(
                walletResponse("stellar", { adminSigner: quorum, recoveryMethods: [quorum] })
            );

            await expect(
                walletFactory.getWallet({
                    chain: "stellar",
                    recovery: { type: "email", email: quorum.members[0].email },
                } as WalletCreateArgs<"stellar">)
            ).rejects.toBeInstanceOf(WalletCreationError);
        });
    });
});

describe("WalletFactory - creating quorums", () => {
    let walletFactory: WalletFactory;
    let mockApiClient: MockedApiClient;

    const CHAIN_TYPES = { "base-sepolia": "evm", solana: "solana", stellar: "stellar" } as const;
    const walletResponse = (chain: keyof typeof CHAIN_TYPES, config: Record<string, unknown>) =>
        ({
            chainType: CHAIN_TYPES[chain],
            type: "smart" as const,
            address: "wallet-address",
            owner: "test-owner",
            config,
            createdAt: Date.now(),
        }) as unknown as GetWalletSuccessResponse;

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
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    describe.each([{ chain: "base-sepolia" }, { chain: "solana" }, { chain: "stellar" }] as const)(
        "on $chain",
        ({ chain }) => {
            describe("createWallet with a recovery quorum", () => {
                it("sends each member's identity fields only, under recoveryMethods", async () => {
                    const quorum = createQuorumFixture(chain);
                    mockApiClient.createWallet.mockResolvedValue(
                        walletResponse(chain, { recoveryMethods: [quorum.entry] })
                    );

                    await walletFactory.createWallet({ chain, recoveryMethods: [quorum.config] } as never);

                    const params = mockApiClient.createWallet.mock.calls[0][0];
                    expect(params.config).toEqual(expect.objectContaining({ recoveryMethods: [quorum.input] }));
                    expect(params.config).not.toHaveProperty("adminSigner");
                    expect(JSON.stringify(params)).not.toContain(QUORUM_SERVER_MEMBER_SECRET);
                });

                it("sends a quorum passed alone under recoveryMethods, never adminSigner", async () => {
                    const quorum = createQuorumFixture(chain);
                    mockApiClient.createWallet.mockResolvedValue(
                        walletResponse(chain, { recoveryMethods: [quorum.entry] })
                    );

                    await walletFactory.createWallet({ chain, recovery: quorum.config } as never);

                    const params = mockApiClient.createWallet.mock.calls[0][0];
                    expect(params.config).toEqual(expect.objectContaining({ recoveryMethods: [quorum.input] }));
                    expect(params.config).not.toHaveProperty("adminSigner");
                });

                it("lists the API's entry and holds none of the members' keys", async () => {
                    const quorum = createQuorumFixture(chain);
                    mockApiClient.createWallet.mockResolvedValue(
                        walletResponse(chain, { recoveryMethods: [quorum.entry] })
                    );

                    const wallet = await walletFactory.createWallet({
                        chain,
                        recoveryMethods: [quorum.config],
                    } as never);

                    expect(wallet.recoveryMethods).toEqual([quorum.entry]);
                    expect(wallet.signer).toBeUndefined();
                });
            });

            describe("createWallet with a delegated quorum", () => {
                it("registers it with each member's identity fields only", async () => {
                    const quorum = createQuorumFixture(chain);
                    mockApiClient.createWallet.mockResolvedValue(
                        walletResponse(chain, {
                            recoveryMethods: [{ type: "api-key", locator: "api-key" }],
                            delegatedSigners: [quorum.entry],
                        })
                    );

                    await walletFactory.createWallet({
                        chain,
                        recoveryMethods: [{ type: "api-key" }],
                        signers: [quorum.config],
                    } as never);

                    const params = mockApiClient.createWallet.mock.calls[0][0];
                    expect(params.config).toEqual(
                        expect.objectContaining({ delegatedSigners: [{ signer: quorum.input }] })
                    );
                });
            });

            describe("createWallet with a delegated quorum and device key storage", () => {
                const deviceKeyStorage = () => ({
                    getKey: vi.fn().mockResolvedValue(null),
                    saveKey: vi.fn().mockResolvedValue(undefined),
                    generateKey: vi
                        .fn()
                        .mockResolvedValue(
                            Buffer.concat([Buffer.from([0x04]), Buffer.alloc(32, 1), Buffer.alloc(32, 2)]).toString(
                                "base64"
                            )
                        ),
                    getDeviceName: vi.fn().mockReturnValue("Chrome on Mac"),
                });
                const sentDelegatedSigners = (call: number) =>
                    (
                        mockApiClient.createWallet.mock.calls[call][0].config as {
                            delegatedSigners: Array<{ signer: unknown }>;
                        }
                    ).delegatedSigners;

                it("registers the quorum next to the device signer it adds", async () => {
                    const quorum = createQuorumFixture(chain);
                    mockApiClient.createWallet.mockResolvedValue(
                        walletResponse(chain, {
                            recoveryMethods: [{ type: "api-key", locator: "api-key" }],
                            delegatedSigners: [quorum.entry],
                        })
                    );

                    await walletFactory.createWallet({
                        chain,
                        recoveryMethods: [{ type: "api-key" }],
                        signers: [quorum.config],
                        options: { deviceSignerKeyStorage: deviceKeyStorage() },
                    } as never);

                    const signers = sentDelegatedSigners(0);
                    expect(signers).toContainEqual({ signer: quorum.input });
                    expect(signers).toContainEqual({ signer: expect.objectContaining({ type: "device" }) });
                });

                it("keeps the quorum when it retries without a device signer the provider rejects", async () => {
                    const quorum = createQuorumFixture(chain);
                    mockApiClient.createWallet
                        .mockResolvedValueOnce({
                            error: true,
                            code: "DEVICE_SIGNER_NOT_SUPPORTED",
                            message: "Device signers are not supported",
                        } as never)
                        .mockResolvedValue(
                            walletResponse(chain, {
                                recoveryMethods: [{ type: "api-key", locator: "api-key" }],
                                delegatedSigners: [quorum.entry],
                            })
                        );

                    await walletFactory.createWallet({
                        chain,
                        recoveryMethods: [{ type: "api-key" }],
                        signers: [quorum.config],
                        options: { deviceSignerKeyStorage: deviceKeyStorage() },
                    } as never);

                    expect(sentDelegatedSigners(1)).toEqual([{ signer: quorum.input }]);
                });
            });

            describe("getWallet with a recovery quorum in the config", () => {
                it("takes the wallet's quorum whatever the member order and address case", async () => {
                    const quorum = createQuorumFixture(chain);
                    mockApiClient.getWallet.mockResolvedValue(
                        walletResponse(chain, { recoveryMethods: [quorum.entry] })
                    );

                    const wallet = await walletFactory.getWallet({
                        chain,
                        recoveryMethods: [withMembersReordered(quorum.config)],
                    } as never);

                    expect(wallet.recoveryMethods).toEqual([quorum.entry]);
                });

                it("matches each of two quorums to its own entry", async () => {
                    const first = createQuorumFixture(chain);
                    const second = createQuorumFixture(chain, 3);
                    mockApiClient.getWallet.mockResolvedValue(
                        walletResponse(chain, { recoveryMethods: [first.entry, second.entry] })
                    );

                    const wallet = await walletFactory.getWallet({
                        chain,
                        recoveryMethods: [second.config, first.config],
                    } as never);

                    expect(wallet.recoveryMethods).toEqual([first.entry, second.entry]);
                });

                it.each([
                    {
                        name: "another threshold",
                        change: (config: ReturnType<typeof createQuorumFixture>["config"]) => ({
                            ...config,
                            threshold: 3,
                        }),
                    },
                    {
                        name: "a member missing",
                        change: (config: ReturnType<typeof createQuorumFixture>["config"]) => ({
                            ...config,
                            members: config.members.slice(1),
                        }),
                    },
                    {
                        name: "another member",
                        change: (config: ReturnType<typeof createQuorumFixture>["config"]) => ({
                            ...config,
                            members: [{ type: "email", email: "mallory@example.com" }, ...config.members.slice(1)],
                        }),
                    },
                ])("rejects a quorum with $name", async ({ change }) => {
                    const quorum = createQuorumFixture(chain);
                    mockApiClient.getWallet.mockResolvedValue(
                        walletResponse(chain, { recoveryMethods: [quorum.entry] })
                    );

                    await expect(
                        walletFactory.getWallet({ chain, recoveryMethods: [change(quorum.config)] } as never)
                    ).rejects.toBeInstanceOf(WalletCreationError);
                });
            });

            describe("getWallet with a delegated quorum in the config", () => {
                it("takes the wallet's delegated quorum whatever the member order", async () => {
                    const quorum = createQuorumFixture(chain);
                    mockApiClient.getWallet.mockResolvedValue(
                        walletResponse(chain, {
                            recoveryMethods: [{ type: "api-key", locator: "api-key" }],
                            delegatedSigners: [quorum.entry],
                        })
                    );

                    await expect(
                        walletFactory.getWallet({ chain, signers: [withMembersReordered(quorum.config)] } as never)
                    ).resolves.toBeDefined();
                });

                it("rejects a delegated quorum the wallet does not have", async () => {
                    const quorum = createQuorumFixture(chain);
                    mockApiClient.getWallet.mockResolvedValue(
                        walletResponse(chain, {
                            recoveryMethods: [{ type: "api-key", locator: "api-key" }],
                            delegatedSigners: [createQuorumFixture(chain, 3).entry],
                        })
                    );

                    await expect(
                        walletFactory.getWallet({ chain, signers: [quorum.config] } as never)
                    ).rejects.toBeInstanceOf(WalletCreationError);
                });
            });
        }
    );
});

describe("WalletFactory - signer initialization in getWallet", () => {
    // getWallet awaits signer initialization. The wallet response already carries each delegated signer's
    // per-chain status, so loading a wallet whose device key is on this device needs no request beyond GET wallet.

    const WALLET_ADDRESS = "0x1234567890123456789012345678901234567890";
    // a valid uncompressed P-256 public key: 0x04 + 32-byte x + 32-byte y
    const DEVICE_KEY = Buffer.concat([Buffer.from([0x04]), Buffer.alloc(32, 1), Buffer.alloc(32, 2)]).toString(
        "base64"
    );
    const DEVICE_LOCATOR = `device:${DEVICE_KEY}`;

    const walletResponse = (deviceChains: Record<string, { status: string; id?: string }>) =>
        ({
            chainType: "evm",
            type: "smart",
            address: WALLET_ADDRESS,
            owner: "email:user@example.com",
            config: {
                adminSigner: { type: "email", email: "user@example.com", locator: "email:user@example.com" },
                delegatedSigners: [{ type: "device", locator: DEVICE_LOCATOR, chains: deviceChains }],
            },
            createdAt: Date.now(),
        }) as unknown as GetWalletSuccessResponse;

    const keyStorage = (where: "mapped" | "unmapped") => ({
        preload: vi.fn(),
        getKey: vi.fn().mockResolvedValue(where === "mapped" ? DEVICE_KEY : null),
        hasKey: vi.fn().mockImplementation(async (key: string) => key === DEVICE_KEY),
        mapAddressToKey: vi.fn().mockResolvedValue(undefined),
        saveSignerLocator: vi.fn().mockResolvedValue(undefined),
        generateKey: vi.fn(),
        signMessage: vi.fn(),
        deleteKey: vi.fn(),
        getDeviceName: vi.fn().mockReturnValue("Test Device"),
    });

    let apiClient: {
        isServerSide: boolean;
        projectId: string;
        environment: APIKeyEnvironmentPrefix;
        getWallet: MockedFunction<ApiClient["getWallet"]>;
        getSigner: MockedFunction<ApiClient["getSigner"]>;
    };
    let factory: WalletFactory;

    beforeEach(() => {
        vi.resetAllMocks();
        walletsLogger.debug = vi.fn();
        apiClient = {
            isServerSide: false,
            projectId: "test-project",
            environment: APIKeyEnvironmentPrefix.STAGING,
            getWallet: vi.fn(),
            getSigner: vi.fn(),
        };
        factory = new WalletFactory(apiClient as unknown as ApiClient);
    });

    it.each(["mapped", "unmapped"] as const)(
        "uses this device's signer with its status from the wallet response, in one request (key %s)",
        async (where) => {
            apiClient.getWallet.mockResolvedValue(walletResponse({ "base-sepolia": { status: "success" } }));
            const storage = keyStorage(where);

            const wallet = await factory.getWallet({
                chain: "base-sepolia",
                options: { deviceSignerKeyStorage: storage as never },
            });

            expect(apiClient.getWallet).toHaveBeenCalledTimes(1);
            expect(apiClient.getSigner).not.toHaveBeenCalled();
            expect(wallet.signer?.locator()).toBe(DEVICE_LOCATOR);
            expect(wallet.signer?.status).toBe("success");
            expect(wallet.needsRecovery()).toBe(false);
            if (where === "unmapped") {
                expect(storage.mapAddressToKey).toHaveBeenCalledWith(WALLET_ADDRESS, DEVICE_KEY);
            }
        }
    );

    it("needs recovery when the response shows this device's signer still awaiting approval", async () => {
        apiClient.getWallet.mockResolvedValue(
            walletResponse({ "base-sepolia": { status: "awaiting-approval", id: "sig-1" } })
        );

        const wallet = await factory.getWallet({
            chain: "base-sepolia",
            options: { deviceSignerKeyStorage: keyStorage("mapped") as never },
        });

        expect(apiClient.getSigner).not.toHaveBeenCalled();
        expect(wallet.signer?.status).toBe("awaiting-approval");
        expect(wallet.needsRecovery()).toBe(true);
    });

    it("ignores a device signer approved only on another chain, like signers() does", async () => {
        apiClient.getWallet.mockResolvedValue(walletResponse({ base: { status: "success" } }));

        const wallet = await factory.getWallet({
            chain: "base-sepolia",
            options: { deviceSignerKeyStorage: keyStorage("unmapped") as never },
        });

        expect(apiClient.getWallet).toHaveBeenCalledTimes(1);
        expect(wallet.signer).toBeUndefined();
        expect(wallet.needsRecovery()).toBe(true);
    });

    it("starts loading the key storage before the wallet request returns", async () => {
        const storage = keyStorage("mapped");
        apiClient.getWallet.mockImplementation(async () => {
            expect(storage.preload).toHaveBeenCalledTimes(1);
            return walletResponse({ "base-sepolia": { status: "success" } });
        });

        await factory.getWallet({ chain: "base-sepolia", options: { deviceSignerKeyStorage: storage as never } });

        expect(storage.preload).toHaveBeenCalledTimes(1);
    });
});
