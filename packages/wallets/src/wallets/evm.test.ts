import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { EVMWallet } from "./evm";
import type { CreateTransactionSuccessResponse } from "../api";
import { TransactionNotCreatedError, InvalidTypedDataError, SignatureNotCreatedError } from "../utils/errors";
import { createMockWallet, createMockApiClient, type MockedApiClient } from "./__tests__/test-helpers";

describe("EVMWallet - sendTransaction()", () => {
    let mockApiClient: MockedApiClient;
    let evmWallet: EVMWallet;

    beforeEach(() => {
        vi.clearAllMocks();
        vi.useFakeTimers();
        mockApiClient = createMockApiClient();
        const wallet = createMockWallet("base-sepolia", mockApiClient, "api-key");
        evmWallet = EVMWallet.from(wallet);
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    describe("success cases", () => {
        it("should send transaction with transaction string", async () => {
            const mockTransactionResponse = {
                id: "txn-123",
                status: "pending",
                chainType: "evm",
                walletType: "smart" as const,
                onChain: {
                    txId: "0xabcdef",
                    explorerLink: "https://explorer.example.com/tx/0xabcdef",
                },
                params: {
                    transaction: "0x1234567890abcdef",
                    signer: "api-key:test",
                },
                createdAt: Date.now(),
            } as unknown as CreateTransactionSuccessResponse;

            const mockApprovedTransaction = {
                ...mockTransactionResponse,
                status: "success",
            };

            mockApiClient.createTransaction.mockResolvedValue(mockTransactionResponse);
            mockApiClient.getTransaction.mockResolvedValue(mockApprovedTransaction as any);

            const sendPromise = evmWallet.sendTransaction({
                transaction: "0x1234567890abcdef",
            });
            await vi.runAllTimersAsync();
            const result = await sendPromise;

            expect(result.hash).toBe("0xabcdef");
            expect(result.transactionId).toBe("txn-123");
            expect(mockApiClient.createTransaction).toHaveBeenCalledWith(
                "me:evm:smart",
                expect.objectContaining({
                    params: expect.objectContaining({
                        calls: [{ transaction: "0x1234567890abcdef" }],
                    }),
                })
            );
        });

        it("should send transaction with to, value, and data", async () => {
            const mockTransactionResponse = {
                id: "txn-456",
                status: "success",
                chainType: "evm",
                walletType: "smart" as const,
                onChain: {
                    txId: "0x789abc",
                    explorerLink: "https://explorer.example.com/tx/0x789abc",
                },
                params: {
                    calls: [{ to: "0xrecipient", value: "1000000000000000000", data: "0xabcd" }],
                    signer: "api-key:test",
                },
                createdAt: Date.now(),
            } as unknown as CreateTransactionSuccessResponse;

            mockApiClient.createTransaction.mockResolvedValue(mockTransactionResponse);
            mockApiClient.getTransaction.mockResolvedValue(mockTransactionResponse as any);

            const sendPromise = evmWallet.sendTransaction({
                to: "0xrecipient",
                value: BigInt("1000000000000000000"), // 1 ETH
                data: "0xabcd",
            });
            await vi.runAllTimersAsync();
            const result = await sendPromise;

            expect(result.hash).toBe("0x789abc");
            expect(mockApiClient.createTransaction).toHaveBeenCalledWith(
                "me:evm:smart",
                expect.objectContaining({
                    params: expect.objectContaining({
                        calls: [
                            {
                                to: "0xrecipient",
                                value: "1000000000000000000",
                                data: "0xabcd",
                            },
                        ],
                    }),
                })
            );
        });

        it("should send transaction with ABI and function call", async () => {
            const mockTransactionResponse = {
                id: "txn-789",
                status: "success",
                chainType: "evm",
                walletType: "smart" as const,
                onChain: {
                    txId: "0xdef123",
                    explorerLink: "https://explorer.example.com/tx/0xdef123",
                },
                params: {
                    calls: [{ to: "0xtoken", data: "0xencoded" }],
                    signer: "api-key:test",
                },
                createdAt: Date.now(),
            } as unknown as CreateTransactionSuccessResponse;

            const mockAbi = [
                {
                    name: "transfer",
                    type: "function",
                    stateMutability: "nonpayable" as const,
                    inputs: [
                        { name: "to", type: "address" },
                        { name: "amount", type: "uint256" },
                    ],
                    outputs: [],
                },
            ] as const;

            mockApiClient.createTransaction.mockResolvedValue(mockTransactionResponse);
            mockApiClient.getTransaction.mockResolvedValue(mockTransactionResponse as any);

            const sendPromise = evmWallet.sendTransaction({
                to: "0x1234567890123456789012345678901234567890",
                abi: mockAbi,
                functionName: "transfer",
                args: ["0x0987654321098765432109876543210987654321", BigInt("1000")],
            });
            await vi.runAllTimersAsync();
            const result = await sendPromise;

            expect(result.hash).toBe("0xdef123");
            expect(mockApiClient.createTransaction).toHaveBeenCalled();
        });

        it("should return prepared transaction when experimental_prepareOnly is true", async () => {
            const mockTransactionResponse = {
                id: "txn-prepare",
                status: "pending",
                chainType: "evm",
                walletType: "smart" as const,
                params: {
                    calls: [{ to: "0xrecipient", value: "1000", data: "0x" }],
                    signer: "api-key:test",
                },
                createdAt: Date.now(),
            } as unknown as CreateTransactionSuccessResponse;

            mockApiClient.createTransaction.mockResolvedValue(mockTransactionResponse);

            const result = await evmWallet.sendTransaction({
                to: "0xrecipient",
                value: BigInt("1000"),
                options: { experimental_prepareOnly: true },
            });

            expect(result.hash).toBeUndefined();
            expect(result.transactionId).toBe("txn-prepare");
            expect(mockApiClient.getTransaction).not.toHaveBeenCalled();
        });
    });

    describe("error cases", () => {
        it("should throw TransactionNotCreatedError when API returns error", async () => {
            const errorResponse = {
                error: {
                    message: "Transaction creation failed",
                },
            };

            mockApiClient.createTransaction.mockResolvedValue(errorResponse as any);

            await expect(
                evmWallet.sendTransaction({
                    to: "0xrecipient",
                    value: BigInt("1000"),
                })
            ).rejects.toThrow(TransactionNotCreatedError);
        });

        it("should throw error when functionName is provided without abi", async () => {
            await expect(
                evmWallet.sendTransaction({
                    to: "0xrecipient",
                    functionName: "transfer",
                    args: ["0xrecipient", BigInt("1000")],
                } as any)
            ).rejects.toThrow();
        });
    });
});

describe("EVMWallet - signMessage()", () => {
    let mockApiClient: MockedApiClient;
    let evmWallet: EVMWallet;

    beforeEach(() => {
        vi.clearAllMocks();
        vi.useFakeTimers();
        mockApiClient = createMockApiClient();
        const wallet = createMockWallet("base-sepolia", mockApiClient, "api-key");
        evmWallet = EVMWallet.from(wallet);
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    describe("success cases", () => {
        it("should sign message successfully", async () => {
            const mockSignatureResponse = {
                id: "sig-123",
                status: "success",
                outputSignature: "0xsignedmessage",
            };

            mockApiClient.createSignature.mockResolvedValue(mockSignatureResponse as any);
            mockApiClient.getSignature.mockResolvedValue(mockSignatureResponse as any);

            const signPromise = evmWallet.signMessage({
                message: "Hello, world!",
            });
            await vi.runAllTimersAsync();
            const result = await signPromise;

            expect(result.signature).toBe("0xsignedmessage");
            expect(result.signatureId).toBe("sig-123");
            expect(mockApiClient.createSignature).toHaveBeenCalledWith(
                "me:evm:smart",
                expect.objectContaining({
                    type: "message",
                    params: expect.objectContaining({
                        message: "Hello, world!",
                        chain: "base-sepolia",
                    }),
                })
            );
        });

        it("should return prepared signature when experimental_prepareOnly is true", async () => {
            const mockSignatureResponse = {
                id: "sig-prepare",
                status: "pending",
            };

            mockApiClient.createSignature.mockResolvedValue(mockSignatureResponse as any);

            const result = await evmWallet.signMessage({
                message: "Hello, world!",
                options: { experimental_prepareOnly: true },
            });

            expect(result.signature).toBeUndefined();
            expect(result.signatureId).toBe("sig-prepare");
            expect(mockApiClient.getSignature).not.toHaveBeenCalled();
        });
    });

    describe("error cases", () => {
        it("should throw SignatureNotCreatedError when API returns error", async () => {
            const errorResponse = {
                error: {
                    message: "Signature creation failed",
                },
            };

            mockApiClient.createSignature.mockResolvedValue(errorResponse as any);

            await expect(
                evmWallet.signMessage({
                    message: "Hello, world!",
                })
            ).rejects.toThrow(SignatureNotCreatedError);
        });
    });
});

describe("EVMWallet - signTypedData()", () => {
    let mockApiClient: MockedApiClient;
    let evmWallet: EVMWallet;

    beforeEach(() => {
        vi.clearAllMocks();
        vi.useFakeTimers();
        mockApiClient = createMockApiClient();
        const wallet = createMockWallet("base-sepolia", mockApiClient, "api-key");
        evmWallet = EVMWallet.from(wallet);
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    describe("success cases", () => {
        it("should sign typed data successfully", async () => {
            const mockSignatureResponse = {
                id: "sig-typed-123",
                status: "success",
                outputSignature: "0xsignedtypeddata",
            };

            const typedData = {
                domain: {
                    name: "MyDApp",
                    version: "1",
                    chainId: 84532, // base-sepolia
                    verifyingContract: "0x1234567890123456789012345678901234567890" as `0x${string}`,
                },
                types: {
                    Message: [
                        { name: "content", type: "string" },
                    ],
                },
                primaryType: "Message",
                message: {
                    content: "Hello",
                },
            };

            mockApiClient.createSignature.mockResolvedValue(mockSignatureResponse as any);
            mockApiClient.getSignature.mockResolvedValue(mockSignatureResponse as any);

            const signPromise = evmWallet.signTypedData({
                ...typedData,
                chain: "base-sepolia",
            });
            await vi.runAllTimersAsync();
            const result = await signPromise;

            expect(result.signature).toBe("0xsignedtypeddata");
            expect(result.signatureId).toBe("sig-typed-123");
            expect(mockApiClient.createSignature).toHaveBeenCalledWith(
                "me:evm:smart",
                expect.objectContaining({
                    type: "typed-data",
                    params: expect.objectContaining({
                        typedData: expect.objectContaining({
                            domain: expect.objectContaining({
                                name: "MyDApp",
                                version: "1",
                                chainId: 84532,
                                verifyingContract: "0x1234567890123456789012345678901234567890",
                            }),
                        }),
                        chain: "base-sepolia",
                    }),
                })
            );
        });

        it("should return prepared signature when experimental_prepareOnly is true", async () => {
            const mockSignatureResponse = {
                id: "sig-typed-prepare",
                status: "pending",
            };

            mockApiClient.createSignature.mockResolvedValue(mockSignatureResponse as any);

            const result = await evmWallet.signTypedData({
                domain: {
                    name: "MyDApp",
                    version: "1",
                    chainId: 84532,
                    verifyingContract: "0x1234567890123456789012345678901234567890" as `0x${string}`,
                },
                types: {
                    Message: [{ name: "content", type: "string" }],
                },
                primaryType: "Message",
                message: { content: "Hello" },
                chain: "base-sepolia",
                options: { experimental_prepareOnly: true },
            });

            expect(result.signature).toBeUndefined();
            expect(result.signatureId).toBe("sig-typed-prepare");
        });
    });

    describe("error cases", () => {
        it("should throw InvalidTypedDataError when domain is missing required fields", async () => {
            await expect(
                evmWallet.signTypedData({
                    domain: {
                        name: "MyDApp",
                        // Missing version, chainId, verifyingContract
                    } as any,
                    types: {},
                    primaryType: "Message",
                    message: {},
                    chain: "base-sepolia",
                })
            ).rejects.toThrow(InvalidTypedDataError);
        });

        it("should throw InvalidTypedDataError when domain is missing", async () => {
            await expect(
                evmWallet.signTypedData({
                    domain: undefined as any,
                    types: {},
                    primaryType: "Message",
                    message: {},
                    chain: "base-sepolia",
                })
            ).rejects.toThrow(InvalidTypedDataError);
        });

        it("should throw SignatureNotCreatedError when API returns error", async () => {
            const errorResponse = {
                error: {
                    message: "Typed data signature creation failed",
                },
            };

            mockApiClient.createSignature.mockResolvedValue(errorResponse as any);

            await expect(
                evmWallet.signTypedData({
                    domain: {
                        name: "MyDApp",
                        version: "1",
                        chainId: 84532,
                        verifyingContract: "0x1234567890123456789012345678901234567890",
                    },
                    types: {},
                    primaryType: "Message",
                    message: {},
                    chain: "base-sepolia",
                })
            ).rejects.toThrow(SignatureNotCreatedError);
        });
    });
});

describe("EVMWallet - getViemClient()", () => {
    let mockApiClient: MockedApiClient;
    let evmWallet: EVMWallet;

    beforeEach(() => {
        vi.clearAllMocks();
        mockApiClient = createMockApiClient();
        const wallet = createMockWallet("base-sepolia", mockApiClient);
        evmWallet = EVMWallet.from(wallet);
    });

    it("should return a viem public client", () => {
        const client = evmWallet.getViemClient();

        expect(client).toBeDefined();
        expect(client).toHaveProperty("readContract");
        expect(client).toHaveProperty("getBalance");
    });

    it("should accept custom transport", () => {
        const client = evmWallet.getViemClient({
            transport: undefined, // Use default http transport
        });

        expect(client).toBeDefined();
    });
});

describe("EVMWallet - from()", () => {
    let mockApiClient: MockedApiClient;

    beforeEach(() => {
        mockApiClient = createMockApiClient();
    });

    it("should create EVMWallet from valid EVM wallet", () => {
        const wallet = createMockWallet("base-sepolia", mockApiClient);
        const evmWallet = EVMWallet.from(wallet);

        expect(evmWallet).toBeInstanceOf(EVMWallet);
        expect(evmWallet.chain).toBe("base-sepolia");
    });

    it("should throw error when wallet is not EVM", () => {
        const solanaWallet = createMockWallet("solana", mockApiClient);

        expect(() => EVMWallet.from(solanaWallet)).toThrow("Wallet is not an EVM wallet");
    });
});

