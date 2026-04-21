import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { StellarWallet } from "./stellar";
import type { CreateTransactionSuccessResponse } from "../api";
import { TransactionNotCreatedError } from "../utils/errors";
import {
    createMockWallet,
    createMockApiClient,
    createMockSigner,
    type MockedApiClient,
} from "./__tests__/test-helpers";

describe("StellarWallet - sendTransaction()", () => {
    let mockApiClient: MockedApiClient;
    let stellarWallet: StellarWallet;

    beforeEach(async () => {
        vi.clearAllMocks();
        vi.useFakeTimers();
        mockApiClient = createMockApiClient();
        const wallet = await createMockWallet("stellar", mockApiClient, "api-key");
        stellarWallet = StellarWallet.from(wallet);
        vi.spyOn(stellarWallet, "signers").mockImplementation(() =>
            Promise.resolve([{ type: "api-key", locator: "api-key", status: "success" } as any])
        );
        await stellarWallet.useSigner(createMockSigner("api-key", "stellar"));
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
                    explorerLink:
                        "https://stellar.expert/explorer/public/tx/a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6",
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
                        signer: "api-key",
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
                    explorerLink:
                        "https://stellar.expert/explorer/public/tx/b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6a1",
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
                    explorerLink:
                        "https://stellar.expert/explorer/public/tx/c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6a1b2",
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
                        signer: "api-key",
                    }),
                })
            );
        });

        it("should return prepared transaction with prepareOnly", async () => {
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
                options: { prepareOnly: true },
            });

            expect(result.hash).toBeUndefined();
            expect(result.transactionId).toBe("txn-stellar-prepare");
            expect(mockApiClient.getTransaction).not.toHaveBeenCalled();
        });

        it("should use custom signer when signer is provided", async () => {
            const mockTransactionResponse = {
                id: "txn-stellar-custom-signer",
                status: "success",
                chainType: "stellar",
                walletType: "smart" as const,
                onChain: {
                    txId: "d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6a1b2c3",
                    explorerLink:
                        "https://stellar.expert/explorer/public/tx/d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6a1b2c3",
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
                options: { signer: "external-wallet:Gcustom123" },
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
            } catch {}
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

describe("StellarWallet - upgrade() / migrate()", () => {
    let mockApiClient: MockedApiClient;
    let stellarWallet: StellarWallet;

    const makeTxResponse = (id: string, type: "upgrade-wallet" | "migrate-wallet", txHash?: string) =>
        ({
            id,
            status: txHash != null ? "success" : "pending",
            chainType: "stellar",
            walletType: "smart" as const,
            ...(txHash != null
                ? {
                      onChain: {
                          txId: txHash,
                          explorerLink: `https://stellar.expert/explorer/public/tx/${txHash}`,
                      },
                  }
                : {}),
            params: {
                transaction: { type },
                signer: "api-key:test",
            },
            createdAt: Date.now(),
        }) as unknown as CreateTransactionSuccessResponse;

    beforeEach(async () => {
        vi.clearAllMocks();
        vi.useFakeTimers();
        mockApiClient = createMockApiClient();
        const wallet = await createMockWallet("stellar", mockApiClient, "api-key");
        stellarWallet = StellarWallet.from(wallet);
        vi.spyOn(stellarWallet, "signers").mockImplementation(() =>
            Promise.resolve([{ type: "api-key", locator: "api-key", status: "success" } as any])
        );
        await stellarWallet.useSigner(createMockSigner("api-key", "stellar"));
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    const mockGetTransactionById = (responsesById: Record<string, unknown>) => {
        mockApiClient.getTransaction.mockImplementation(async (_walletLocator, txId) => {
            const res = responsesById[txId];
            if (res == null) {
                throw new Error(`Test: unexpected getTransaction call for ${txId}`);
            }
            return res as any;
        });
    };

    it("upgrade() runs both phases and returns the migrate result", async () => {
        const upgradeTx = makeTxResponse("upgrade-tx-1", "upgrade-wallet", "hash-upgrade");
        const migrateTx = makeTxResponse("migrate-tx-1", "migrate-wallet", "hash-migrate");

        mockApiClient.createTransaction.mockResolvedValueOnce(upgradeTx).mockResolvedValueOnce(migrateTx);
        mockGetTransactionById({
            "upgrade-tx-1": upgradeTx,
            "migrate-tx-1": migrateTx,
        });

        const promise = stellarWallet.upgrade();
        await vi.runAllTimersAsync();
        const result = await promise;

        expect(mockApiClient.createTransaction).toHaveBeenCalledTimes(2);
        expect(mockApiClient.createTransaction).toHaveBeenNthCalledWith(
            1,
            "me:stellar:smart",
            expect.objectContaining({
                params: expect.objectContaining({
                    transaction: { type: "upgrade-wallet" },
                    signer: "api-key",
                }),
            })
        );
        expect(mockApiClient.createTransaction).toHaveBeenNthCalledWith(
            2,
            "me:stellar:smart",
            expect.objectContaining({
                params: expect.objectContaining({
                    transaction: { type: "migrate-wallet" },
                    signer: "api-key",
                }),
            })
        );
        expect(result.transactionId).toBe("migrate-tx-1");
        expect(result.hash).toBe("hash-migrate");
    });

    it("upgrade({ prepareOnly: true }) returns only the phase-1 prepared transaction", async () => {
        const upgradeTx = makeTxResponse("upgrade-tx-prep", "upgrade-wallet");
        mockApiClient.createTransaction.mockResolvedValueOnce(upgradeTx);

        const result = await stellarWallet.upgrade({ prepareOnly: true });

        expect(result.transactionId).toBe("upgrade-tx-prep");
        expect(result.hash).toBeUndefined();
        expect(mockApiClient.createTransaction).toHaveBeenCalledTimes(1);
        expect(mockApiClient.getTransaction).not.toHaveBeenCalled();
    });

    it("upgrade() is idempotent when the wallet is already locked (409 on phase 1)", async () => {
        const lockedError = {
            error: true,
            message: "Wallet is being upgraded. Submit a migrate-wallet transaction to complete the upgrade.",
            statusCode: 409,
        };
        const migrateTx = makeTxResponse("migrate-tx-idem", "migrate-wallet", "hash-migrate-idem");

        mockApiClient.createTransaction.mockResolvedValueOnce(lockedError as any).mockResolvedValueOnce(migrateTx);
        mockGetTransactionById({ "migrate-tx-idem": migrateTx });

        const promise = stellarWallet.upgrade();
        await vi.runAllTimersAsync();
        const result = await promise;

        expect(mockApiClient.createTransaction).toHaveBeenCalledTimes(2);
        const secondCall = mockApiClient.createTransaction.mock.calls[1][1];
        expect((secondCall.params as any).transaction).toEqual({ type: "migrate-wallet" });
        expect(result.transactionId).toBe("migrate-tx-idem");
    });

    it("upgrade() throws when the API returns a non-409 error on phase 1", async () => {
        const errorResponse = {
            error: true,
            message: "Wallet is already on the latest version",
            statusCode: 400,
        };
        mockApiClient.createTransaction.mockResolvedValueOnce(errorResponse as any);

        await expect(stellarWallet.upgrade()).rejects.toThrow(TransactionNotCreatedError);
        expect(mockApiClient.createTransaction).toHaveBeenCalledTimes(1);
    });

    it("migrate() sends a migrate-wallet transaction and returns the result", async () => {
        const migrateTx = makeTxResponse("migrate-solo", "migrate-wallet", "hash-migrate-solo");
        mockApiClient.createTransaction.mockResolvedValueOnce(migrateTx);
        mockGetTransactionById({ "migrate-solo": migrateTx });

        const promise = stellarWallet.migrate();
        await vi.runAllTimersAsync();
        const result = await promise;

        expect(mockApiClient.createTransaction).toHaveBeenCalledWith(
            "me:stellar:smart",
            expect.objectContaining({
                params: expect.objectContaining({
                    transaction: { type: "migrate-wallet" },
                }),
            })
        );
        expect(result.transactionId).toBe("migrate-solo");
        expect(result.hash).toBe("hash-migrate-solo");
    });

    it("migrate({ prepareOnly: true }) does not trigger approval", async () => {
        const migrateTx = makeTxResponse("migrate-prep", "migrate-wallet");
        mockApiClient.createTransaction.mockResolvedValueOnce(migrateTx);

        const result = await stellarWallet.migrate({ prepareOnly: true });

        expect(result.transactionId).toBe("migrate-prep");
        expect(result.hash).toBeUndefined();
        expect(mockApiClient.getTransaction).not.toHaveBeenCalled();
    });

    it("migrate() rethrows when submitted against a wallet that is not locked (400)", async () => {
        const errorResponse = {
            error: true,
            message: "No upgrade in progress. Submit an upgrade-wallet transaction first.",
            statusCode: 400,
        };
        mockApiClient.createTransaction.mockResolvedValueOnce(errorResponse as any);

        await expect(stellarWallet.migrate()).rejects.toThrow(TransactionNotCreatedError);
    });

    it("forwards an explicit signer override to both phases", async () => {
        const upgradeTx = makeTxResponse("upgrade-sig", "upgrade-wallet", "hash-up");
        const migrateTx = makeTxResponse("migrate-sig", "migrate-wallet", "hash-mig");
        mockApiClient.createTransaction.mockResolvedValueOnce(upgradeTx).mockResolvedValueOnce(migrateTx);
        mockGetTransactionById({
            "upgrade-sig": upgradeTx,
            "migrate-sig": migrateTx,
        });

        const promise = stellarWallet.upgrade({ signer: "external-wallet:Gcustom999" });
        await vi.runAllTimersAsync();
        await promise;

        for (const call of mockApiClient.createTransaction.mock.calls) {
            expect((call[1].params as any).signer).toBe("external-wallet:Gcustom999");
        }
    });
});

describe("StellarWallet - from()", () => {
    let mockApiClient: MockedApiClient;

    beforeEach(() => {
        mockApiClient = createMockApiClient();
    });

    it("should create StellarWallet from valid Stellar wallet", async () => {
        const wallet = await createMockWallet("stellar", mockApiClient);
        const stellarWallet = StellarWallet.from(wallet);

        expect(stellarWallet).toBeInstanceOf(StellarWallet);
        expect(stellarWallet.chain).toBe("stellar");
    });

    it("should throw error when wallet is not Stellar", async () => {
        const evmWallet = await createMockWallet("base-sepolia", mockApiClient);

        expect(() => StellarWallet.from(evmWallet)).toThrow("Wallet is not a Stellar wallet");
    });
});
