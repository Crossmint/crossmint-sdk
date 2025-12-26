import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { StellarWallet } from "./stellar";
import type { CreateTransactionSuccessResponse } from "../api";
import { TransactionNotCreatedError } from "../utils/errors";
import { createMockWallet, createMockApiClient, type MockedApiClient } from "./__tests__/test-helpers";

describe("StellarWallet - sendTransaction()", () => {
    let mockApiClient: MockedApiClient;
    let stellarWallet: StellarWallet;

    beforeEach(() => {
        vi.clearAllMocks();
        vi.useFakeTimers();
        mockApiClient = createMockApiClient();
        const wallet = createMockWallet("stellar", mockApiClient, "api-key");
        stellarWallet = StellarWallet.from(wallet);
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    describe("success cases", () => {
        it("should send transaction with contract call", async () => {
            const mockTransactionResponse = {
                id: "txn-stellar-123",
                status: "success",
                chainType: "stellar",
                walletType: "smart" as const,
                onChain: {
                    txId: "a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6",
                    explorerLink: "https://stellar.expert/explorer/public/tx/a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6",
                },
                params: {
                    transaction: {
                        type: "contract-call",
                        contractId: "CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC",
                        method: "transfer",
                        args: {
                            to: "GABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890ABCDEFGHIJKLMNOPQRSTUV",
                            amount: "1000000",
                        },
                    },
                    signer: "api-key:test",
                },
                createdAt: Date.now(),
            } as unknown as CreateTransactionSuccessResponse;

            mockApiClient.createTransaction.mockResolvedValue(mockTransactionResponse);
            mockApiClient.getTransaction.mockResolvedValue(mockTransactionResponse as any);

            const sendPromise = stellarWallet.sendTransaction({
                contractId: "CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC",
                method: "transfer",
                args: {
                    to: "GABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890ABCDEFGHIJKLMNOPQRSTUV",
                    amount: "1000000",
                },
            });
            await vi.runAllTimersAsync();
            const result = await sendPromise;

            expect(result.hash).toBe("a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6");
            expect(result.transactionId).toBe("txn-stellar-123");
            expect(mockApiClient.createTransaction).toHaveBeenCalledWith(
                "me:stellar:smart",
                expect.objectContaining({
                    params: expect.objectContaining({
                        transaction: expect.objectContaining({
                            type: "contract-call",
                            contractId: "CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC",
                            method: "transfer",
                            args: {
                                to: "GABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890ABCDEFGHIJKLMNOPQRSTUV",
                                amount: "1000000",
                            },
                        }),
                        signer: "api-key:test",
                    }),
                })
            );
        });

        it("should send transaction with contract call and memo", async () => {
            const mockTransactionResponse = {
                id: "txn-stellar-456",
                status: "success",
                chainType: "stellar",
                walletType: "smart" as const,
                onChain: {
                    txId: "b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6a1",
                    explorerLink: "https://stellar.expert/explorer/public/tx/b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6a1",
                },
                params: {
                    transaction: {
                        type: "contract-call",
                        contractId: "CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC",
                        method: "transfer",
                        args: {
                            to: "GABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890ABCDEFGHIJKLMNOPQRSTUV",
                            amount: "1000000",
                        },
                        memo: {
                            type: "text",
                            value: "Test memo",
                        },
                    },
                    signer: "api-key:test",
                },
                createdAt: Date.now(),
            } as unknown as CreateTransactionSuccessResponse;

            mockApiClient.createTransaction.mockResolvedValue(mockTransactionResponse);
            mockApiClient.getTransaction.mockResolvedValue(mockTransactionResponse as any);

            const sendPromise = stellarWallet.sendTransaction({
                contractId: "CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC",
                method: "transfer",
                args: {
                    to: "GABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890ABCDEFGHIJKLMNOPQRSTUV",
                    amount: "1000000",
                },
                memo: "Test memo",
            });
            await vi.runAllTimersAsync();
            const result = await sendPromise;

            expect(result.hash).toBe("b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6a1");
            expect(mockApiClient.createTransaction).toHaveBeenCalledWith(
                "me:stellar:smart",
                expect.objectContaining({
                    params: expect.objectContaining({
                        transaction: expect.objectContaining({
                            memo: {
                                type: "text",
                                value: "Test memo",
                            },
                        }),
                    }),
                })
            );
        });

        it("should send transaction with serialized transaction", async () => {
            const serializedTx = "AAAAAgAAAAA="; // Base64 encoded transaction
            const mockTransactionResponse = {
                id: "txn-stellar-789",
                status: "success",
                chainType: "stellar",
                walletType: "smart" as const,
                onChain: {
                    txId: "c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6a1b2",
                    explorerLink: "https://stellar.expert/explorer/public/tx/c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6a1b2",
                },
                params: {
                    transaction: {
                        type: "serialized-transaction",
                        serializedTransaction: serializedTx,
                        contractId: "CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC",
                    },
                    signer: "api-key:test",
                },
                createdAt: Date.now(),
            } as unknown as CreateTransactionSuccessResponse;

            mockApiClient.createTransaction.mockResolvedValue(mockTransactionResponse);
            mockApiClient.getTransaction.mockResolvedValue(mockTransactionResponse as any);

            const sendPromise = stellarWallet.sendTransaction({
                transaction: serializedTx,
                contractId: "CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC",
            });
            await vi.runAllTimersAsync();
            const result = await sendPromise;

            expect(result.hash).toBe("c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6a1b2");
            expect(result.transactionId).toBe("txn-stellar-789");
            expect(mockApiClient.createTransaction).toHaveBeenCalledWith(
                "me:stellar:smart",
                expect.objectContaining({
                    params: expect.objectContaining({
                        transaction: expect.objectContaining({
                            type: "serialized-transaction",
                            serializedTransaction: serializedTx,
                            contractId: "CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC",
                        }),
                        signer: "api-key:test",
                    }),
                })
            );
        });

        it("should return prepared transaction when experimental_prepareOnly is true", async () => {
            const mockTransactionResponse = {
                id: "txn-stellar-prepare",
                status: "pending",
                chainType: "stellar",
                walletType: "smart" as const,
                params: {
                    transaction: {
                        type: "contract-call",
                        contractId: "CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC",
                        method: "transfer",
                        args: {
                            to: "GABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890ABCDEFGHIJKLMNOPQRSTUV",
                            amount: "1000000",
                        },
                    },
                    signer: "api-key:test",
                },
                createdAt: Date.now(),
            } as unknown as CreateTransactionSuccessResponse;

            mockApiClient.createTransaction.mockResolvedValue(mockTransactionResponse);

            const result = await stellarWallet.sendTransaction({
                contractId: "CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC",
                method: "transfer",
                args: {
                    to: "GABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890ABCDEFGHIJKLMNOPQRSTUV",
                    amount: "1000000",
                },
                options: { experimental_prepareOnly: true },
            });

            expect(result.hash).toBeUndefined();
            expect(result.transactionId).toBe("txn-stellar-prepare");
            // getTransaction should not be called when prepareOnly is true
            expect(mockApiClient.getTransaction).not.toHaveBeenCalled();
        });

        it("should use custom signer when experimental_signer is provided", async () => {
            const mockTransactionResponse = {
                id: "txn-stellar-custom-signer",
                status: "success",
                chainType: "stellar",
                walletType: "smart" as const,
                onChain: {
                    txId: "d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6a1b2c3",
                    explorerLink: "https://stellar.expert/explorer/public/tx/d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6a1b2c3",
                },
                params: {
                    transaction: {
                        type: "contract-call",
                        contractId: "CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC",
                        method: "transfer",
                        args: {
                            to: "GABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890ABCDEFGHIJKLMNOPQRSTUV",
                            amount: "1000000",
                        },
                    },
                    signer: "external-wallet:Gcustom123",
                },
                createdAt: Date.now(),
            } as unknown as CreateTransactionSuccessResponse;

            mockApiClient.createTransaction.mockResolvedValue(mockTransactionResponse);
            mockApiClient.getTransaction.mockResolvedValue(mockTransactionResponse as any);

            const sendPromise = stellarWallet.sendTransaction({
                contractId: "CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC",
                method: "transfer",
                args: {
                    to: "GABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890ABCDEFGHIJKLMNOPQRSTUV",
                    amount: "1000000",
                },
                options: { experimental_signer: "external-wallet:Gcustom123", experimental_prepareOnly: false },
            });
            await vi.runAllTimersAsync();
            await sendPromise;

            expect(mockApiClient.createTransaction).toHaveBeenCalledWith(
                "me:stellar:smart",
                expect.objectContaining({
                    params: expect.objectContaining({
                        signer: "external-wallet:Gcustom123",
                    }),
                })
            );
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

            const promise = stellarWallet.sendTransaction({
                contractId: "CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC",
                method: "transfer",
                args: {
                    to: "GABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890ABCDEFGHIJKLMNOPQRSTUV",
                    amount: "1000000",
                },
            });
            
            await expect(promise).rejects.toThrow(TransactionNotCreatedError);
            
            try {
                await promise;
            } catch {
            }
        });

        it("should throw error when transaction approval fails", async () => {
            const mockTransactionResponse = {
                id: "txn-fail",
                status: "pending",
                chainType: "stellar",
                walletType: "smart" as const,
                params: {
                    transaction: {
                        type: "contract-call",
                        contractId: "CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC",
                        method: "transfer",
                        args: {
                            to: "GABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890ABCDEFGHIJKLMNOPQRSTUV",
                            amount: "1000000",
                        },
                    },
                    signer: "api-key:test",
                },
                createdAt: Date.now(),
            } as unknown as CreateTransactionSuccessResponse;

            mockApiClient.createTransaction.mockResolvedValue(mockTransactionResponse);
            mockApiClient.getTransaction.mockResolvedValue({
                id: "txn-fail",
                status: "failed",
                error: "Transaction failed",
            } as any);

            const promise = stellarWallet.sendTransaction({
                contractId: "CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC",
                method: "transfer",
                args: {
                    to: "GABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890ABCDEFGHIJKLMNOPQRSTUV",
                    amount: "1000000",
                },
            });
            
            const errorPromise = promise.catch(() => {});
            await vi.runAllTimersAsync();
            await expect(promise).rejects.toThrow();
            await errorPromise;
        });
    });
});

describe("StellarWallet - from()", () => {
    let mockApiClient: MockedApiClient;

    beforeEach(() => {
        mockApiClient = createMockApiClient();
    });

    it("should create StellarWallet from valid Stellar wallet", () => {
        const wallet = createMockWallet("stellar", mockApiClient);
        const stellarWallet = StellarWallet.from(wallet);

        expect(stellarWallet).toBeInstanceOf(StellarWallet);
        expect(stellarWallet.chain).toBe("stellar");
    });

    it("should throw error when wallet is not Stellar", () => {
        const evmWallet = createMockWallet("base-sepolia", mockApiClient);

        expect(() => StellarWallet.from(evmWallet)).toThrow("Wallet is not a Stellar wallet");
    });
});

