import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SolanaWallet } from "./solana";
import type { CreateTransactionSuccessResponse } from "../api";
import { TransactionNotCreatedError } from "../utils/errors";
import { createMockWallet, createMockApiClient, createMockSerializedTransaction, type MockedApiClient } from "./__tests__/test-helpers";

describe("SolanaWallet - sendTransaction()", () => {
    let mockApiClient: MockedApiClient;
    let solanaWallet: SolanaWallet;

    beforeEach(() => {
        vi.clearAllMocks();
        vi.useFakeTimers();
        mockApiClient = createMockApiClient();
        const wallet = createMockWallet("solana", mockApiClient, "api-key");
        solanaWallet = SolanaWallet.from(wallet);
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    describe("success cases", () => {
        it("should send transaction with serialized transaction string", async () => {
            const serializedTx = createMockSerializedTransaction();

            const mockTransactionResponse = {
                id: "txn-sol-123",
                status: "success",
                chainType: "solana",
                walletType: "smart" as const,
                onChain: {
                    txId: "5VERv8NMvzbJMEkV8xnrLkEaWRtSz9CosKDYjCJjBRnbJLgp8uirBgmQpjKhoR4tjF3ZpRzrFmBV6UjKdiSZkQUW",
                    explorerLink: "https://explorer.solana.com/tx/5VERv8NMvzbJMEkV8xnrLkEaWRtSz9CosKDYjCJjBRnbJLgp8uirBgmQpjKhoR4tjF3ZpRzrFmBV6UjKdiSZkQUW",
                },
                params: {
                    transaction: serializedTx,
                    signer: "api-key:test",
                },
                createdAt: Date.now(),
            } as unknown as CreateTransactionSuccessResponse;

            mockApiClient.createTransaction.mockResolvedValue(mockTransactionResponse);
            mockApiClient.getTransaction.mockResolvedValue(mockTransactionResponse as any);

            const sendPromise = solanaWallet.sendTransaction({
                serializedTransaction: serializedTx,
            });
            await vi.runAllTimersAsync();
            const result = await sendPromise;

            expect(result.hash).toBe("5VERv8NMvzbJMEkV8xnrLkEaWRtSz9CosKDYjCJjBRnbJLgp8uirBgmQpjKhoR4tjF3ZpRzrFmBV6UjKdiSZkQUW");
            expect(result.transactionId).toBe("txn-sol-123");
            expect(mockApiClient.createTransaction).toHaveBeenCalledWith(
                "me:solana:smart",
                expect.objectContaining({
                    params: expect.objectContaining({
                        transaction: expect.any(String),
                        signer: "api-key:test",
                    }),
                })
            );
        });

        it("should send transaction with serialized transaction string", async () => {
            const serializedTx = "AQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABAgEDBQrKxEIIPWsDwcGCzLQ7FGIHQ38p0dZq6bG2v2wUAUqMx3jV1jZ0";

            const mockTransactionResponse = {
                id: "txn-sol-456",
                status: "success",
                chainType: "solana",
                walletType: "smart" as const,
                onChain: {
                    txId: "5VERv8NMvzbJMEkV8xnrLkEaWRtSz9CosKDYjCJjBRnbJLgp8uirBgmQpjKhoR4tjF3ZpRzrFmBV6UjKdiSZkQUW",
                    explorerLink: "https://explorer.solana.com/tx/5VERv8NMvzbJMEkV8xnrLkEaWRtSz9CosKDYjCJjBRnbJLgp8uirBgmQpjKhoR4tjF3ZpRzrFmBV6UjKdiSZkQUW",
                },
                params: {
                    transaction: serializedTx,
                    signer: "api-key:test",
                },
                createdAt: Date.now(),
            } as unknown as CreateTransactionSuccessResponse;

            mockApiClient.createTransaction.mockResolvedValue(mockTransactionResponse);
            mockApiClient.getTransaction.mockResolvedValue(mockTransactionResponse as any);

            const sendPromise = solanaWallet.sendTransaction({
                serializedTransaction: serializedTx,
            });
            await vi.runAllTimersAsync();
            const result = await sendPromise;

            expect(result.hash).toBe("5VERv8NMvzbJMEkV8xnrLkEaWRtSz9CosKDYjCJjBRnbJLgp8uirBgmQpjKhoR4tjF3ZpRzrFmBV6UjKdiSZkQUW");
            expect(result.transactionId).toBe("txn-sol-456");
            expect(mockApiClient.createTransaction).toHaveBeenCalledWith(
                "me:solana:smart",
                expect.objectContaining({
                    params: expect.objectContaining({
                        transaction: serializedTx,
                        signer: "api-key:test",
                    }),
                })
            );
        });

        it("should return prepared transaction when experimental_prepareOnly is true", async () => {
            const serializedTx = createMockSerializedTransaction();

            const mockTransactionResponse = {
                id: "txn-sol-prepare",
                status: "pending",
                chainType: "solana",
                walletType: "smart" as const,
                params: {
                    transaction: serializedTx,
                    signer: "api-key:test",
                },
                createdAt: Date.now(),
            } as unknown as CreateTransactionSuccessResponse;

            mockApiClient.createTransaction.mockResolvedValue(mockTransactionResponse);

            const result = await solanaWallet.sendTransaction({
                serializedTransaction: serializedTx,
                options: { experimental_prepareOnly: true },
            });

            expect(result.hash).toBeUndefined();
            expect(result.transactionId).toBe("txn-sol-prepare");
            expect(mockApiClient.getTransaction).not.toHaveBeenCalled();
        });

        it("should handle additional signers", async () => {
            const serializedTx = createMockSerializedTransaction();

            const mockTransactionResponse = {
                id: "txn-sol-with-signers",
                status: "success",
                chainType: "solana",
                walletType: "smart" as const,
                onChain: {
                    txId: "5VERv8NMvzbJMEkV8xnrLkEaWRtSz9CosKDYjCJjBRnbJLgp8uirBgmQpjKhoR4tjF3ZpRzrFmBV6UjKdiSZkQUW",
                    explorerLink: "https://explorer.solana.com/tx/5VERv8NMvzbJMEkV8xnrLkEaWRtSz9CosKDYjCJjBRnbJLgp8uirBgmQpjKhoR4tjF3ZpRzrFmBV6UjKdiSZkQUW",
                },
                params: {
                    transaction: serializedTx,
                    signer: "api-key:test",
                },
                createdAt: Date.now(),
            } as unknown as CreateTransactionSuccessResponse;

            mockApiClient.createTransaction.mockResolvedValue(mockTransactionResponse);
            mockApiClient.getTransaction.mockResolvedValue(mockTransactionResponse as any);

            const sendPromise = solanaWallet.sendTransaction({
                serializedTransaction: serializedTx,
            });
            await vi.runAllTimersAsync();
            const result = await sendPromise;

            expect(result.hash).toBeDefined();
            expect(result.transactionId).toBe("txn-sol-with-signers");
        });

        it("should use custom signer when experimental_signer is provided", async () => {
            const serializedTx = createMockSerializedTransaction();

            const mockTransactionResponse = {
                id: "txn-sol-custom-signer",
                status: "success",
                chainType: "solana",
                walletType: "smart" as const,
                onChain: {
                    txId: "5VERv8NMvzbJMEkV8xnrLkEaWRtSz9CosKDYjCJjBRnbJLgp8uirBgmQpjKhoR4tjF3ZpRzrFmBV6UjKdiSZkQUW",
                    explorerLink: "https://explorer.solana.com/tx/5VERv8NMvzbJMEkV8xnrLkEaWRtSz9CosKDYjCJjBRnbJLgp8uirBgmQpjKhoR4tjF3ZpRzrFmBV6UjKdiSZkQUW",
                },
                params: {
                    transaction: serializedTx,
                    signer: "external-wallet:custom123",
                },
                createdAt: Date.now(),
            } as unknown as CreateTransactionSuccessResponse;

            mockApiClient.createTransaction.mockResolvedValue(mockTransactionResponse);
            mockApiClient.getTransaction.mockResolvedValue(mockTransactionResponse as any);

            const sendPromise = solanaWallet.sendTransaction({
                serializedTransaction: serializedTx,
                options: { experimental_signer: "external-wallet:custom123", experimental_prepareOnly: false },
            });
            await vi.runAllTimersAsync();
            await sendPromise;

            expect(mockApiClient.createTransaction).toHaveBeenCalledWith(
                "me:solana:smart",
                expect.objectContaining({
                    params: expect.objectContaining({
                        signer: "external-wallet:custom123",
                    }),
                })
            );
        });
    });

    describe("error cases", () => {
        it("should throw TransactionNotCreatedError when API returns error", async () => {
            const serializedTx = createMockSerializedTransaction();
            const errorResponse = {
                error: {
                    message: "Transaction creation failed",
                },
            };

            mockApiClient.createTransaction.mockResolvedValue(errorResponse as any);

            const promise = solanaWallet.sendTransaction({
                serializedTransaction: serializedTx,
            });
            
            await expect(promise).rejects.toThrow(TransactionNotCreatedError);
            
            try {
                await promise;
            } catch {
            }
        });

        it("should throw error when transaction approval fails", async () => {
            const serializedTx = createMockSerializedTransaction();
            const mockTransactionResponse = {
                id: "txn-fail",
                status: "pending",
                chainType: "solana",
                walletType: "smart" as const,
                params: {
                    transaction: serializedTx,
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

            const promise = solanaWallet.sendTransaction({
                serializedTransaction: serializedTx,
            });
            
            const errorPromise = promise.catch(() => {});
            await vi.runAllTimersAsync();
            await expect(promise).rejects.toThrow();
            await errorPromise;
        });
    });
});

describe("SolanaWallet - from()", () => {
    let mockApiClient: MockedApiClient;

    beforeEach(() => {
        mockApiClient = createMockApiClient();
    });

    it("should create SolanaWallet from valid Solana wallet", () => {
        const wallet = createMockWallet("solana", mockApiClient);
        const solanaWallet = SolanaWallet.from(wallet);

        expect(solanaWallet).toBeInstanceOf(SolanaWallet);
        expect(solanaWallet.chain).toBe("solana");
    });

    it("should throw error when wallet is not Solana", async () => {
        const { isValidSolanaAddress } = await import("@crossmint/common-sdk-base");
        vi.mocked(isValidSolanaAddress).mockReturnValueOnce(false);

        const evmWallet = createMockWallet("base-sepolia", mockApiClient);

        expect(() => SolanaWallet.from(evmWallet)).toThrow("Wallet is not a Solana wallet");
    });

    it("should throw error when address is invalid Solana address", async () => {
        const { isValidSolanaAddress } = await import("@crossmint/common-sdk-base");
        vi.mocked(isValidSolanaAddress).mockReturnValueOnce(false);

        const invalidWallet = createMockWallet("solana", mockApiClient);

        expect(() => SolanaWallet.from(invalidWallet)).toThrow("Wallet is not a Solana wallet");
    });
});

