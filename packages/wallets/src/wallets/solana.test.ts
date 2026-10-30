import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import bs58 from "bs58";
import nacl from "tweetnacl";
import { Keypair } from "@solana/web3.js";
import { VERSION_1_MESSAGE } from "../signers/solana-version-1.fixture";
import { SolanaWallet } from "./solana";
import type { SolanaChain } from "../chains/chains";
import type { RecoverySignerConfigForChain } from "../signers/types";
import type { CreateTransactionSuccessResponse } from "../api";
import { TransactionNotCreatedError } from "../utils/errors";
import {
    createMockWallet,
    createMockApiClient,
    createMockSolanaSerializedTransaction,
    createMockSigner,
    type MockedApiClient,
} from "./__tests__/test-helpers";

describe("SolanaWallet - sendTransaction()", () => {
    let mockApiClient: MockedApiClient;
    let solanaWallet: SolanaWallet;

    beforeEach(async () => {
        vi.clearAllMocks();
        vi.useFakeTimers();
        mockApiClient = createMockApiClient();
        const wallet = await createMockWallet("solana", mockApiClient, "api-key");
        solanaWallet = SolanaWallet.from(wallet);
        vi.spyOn(solanaWallet, "signers").mockImplementation(() =>
            Promise.resolve([{ type: "api-key", locator: "api-key", status: "success" } as any])
        );
        await solanaWallet.useSigner(createMockSigner("api-key", "solana"));
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    describe("success cases", () => {
        it("sends transaction with serialized transaction string", async () => {
            const serializedTx = createMockSolanaSerializedTransaction();

            const mockTransactionResponse = {
                id: "txn-sol-123",
                status: "success",
                chainType: "solana",
                walletType: "smart" as const,
                onChain: {
                    txId: "5VERv8NMvzbJMEkV8xnrLkEaWRtSz9CosKDYjCJjBRnbJLgp8uirBgmQpjKhoR4tjF3ZpRzrFmBV6UjKdiSZkQUW",
                    explorerLink:
                        "https://explorer.solana.com/tx/5VERv8NMvzbJMEkV8xnrLkEaWRtSz9CosKDYjCJjBRnbJLgp8uirBgmQpjKhoR4tjF3ZpRzrFmBV6UjKdiSZkQUW",
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

            expect(result.hash).toBe(
                "5VERv8NMvzbJMEkV8xnrLkEaWRtSz9CosKDYjCJjBRnbJLgp8uirBgmQpjKhoR4tjF3ZpRzrFmBV6UjKdiSZkQUW"
            );
            expect(result.transactionId).toBe("txn-sol-123");
            expect(mockApiClient.createTransaction).toHaveBeenCalledWith(
                "me:solana:smart",
                expect.objectContaining({
                    params: expect.objectContaining({
                        transaction: expect.any(String),
                        signer: "api-key",
                    }),
                })
            );
        });

        it("sends transaction with serialized transaction string", async () => {
            const serializedTx =
                "AQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABAgEDBQrKxEIIPWsDwcGCzLQ7FGIHQ38p0dZq6bG2v2wUAUqMx3jV1jZ0";

            const mockTransactionResponse = {
                id: "txn-sol-456",
                status: "success",
                chainType: "solana",
                walletType: "smart" as const,
                onChain: {
                    txId: "5VERv8NMvzbJMEkV8xnrLkEaWRtSz9CosKDYjCJjBRnbJLgp8uirBgmQpjKhoR4tjF3ZpRzrFmBV6UjKdiSZkQUW",
                    explorerLink:
                        "https://explorer.solana.com/tx/5VERv8NMvzbJMEkV8xnrLkEaWRtSz9CosKDYjCJjBRnbJLgp8uirBgmQpjKhoR4tjF3ZpRzrFmBV6UjKdiSZkQUW",
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

            expect(result.hash).toBe(
                "5VERv8NMvzbJMEkV8xnrLkEaWRtSz9CosKDYjCJjBRnbJLgp8uirBgmQpjKhoR4tjF3ZpRzrFmBV6UjKdiSZkQUW"
            );
            expect(result.transactionId).toBe("txn-sol-456");
            expect(mockApiClient.createTransaction).toHaveBeenCalledWith(
                "me:solana:smart",
                expect.objectContaining({
                    params: expect.objectContaining({
                        transaction: serializedTx,
                        signer: "api-key",
                    }),
                })
            );
        });

        it("returns prepared transaction with prepareOnly", async () => {
            const serializedTx = createMockSolanaSerializedTransaction();

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
                options: { prepareOnly: true },
            });

            expect(result.hash).toBeUndefined();
            expect(result.transactionId).toBe("txn-sol-prepare");
            expect(mockApiClient.getTransaction).not.toHaveBeenCalled();
        });

        it("handles additional signers", async () => {
            const serializedTx = createMockSolanaSerializedTransaction();

            const mockTransactionResponse = {
                id: "txn-sol-with-signers",
                status: "success",
                chainType: "solana",
                walletType: "smart" as const,
                onChain: {
                    txId: "5VERv8NMvzbJMEkV8xnrLkEaWRtSz9CosKDYjCJjBRnbJLgp8uirBgmQpjKhoR4tjF3ZpRzrFmBV6UjKdiSZkQUW",
                    explorerLink:
                        "https://explorer.solana.com/tx/5VERv8NMvzbJMEkV8xnrLkEaWRtSz9CosKDYjCJjBRnbJLgp8uirBgmQpjKhoR4tjF3ZpRzrFmBV6UjKdiSZkQUW",
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

        it("uses custom signer when signer is provided", async () => {
            const serializedTx = createMockSolanaSerializedTransaction();

            const mockTransactionResponse = {
                id: "txn-sol-custom-signer",
                status: "success",
                chainType: "solana",
                walletType: "smart" as const,
                onChain: {
                    txId: "5VERv8NMvzbJMEkV8xnrLkEaWRtSz9CosKDYjCJjBRnbJLgp8uirBgmQpjKhoR4tjF3ZpRzrFmBV6UjKdiSZkQUW",
                    explorerLink:
                        "https://explorer.solana.com/tx/5VERv8NMvzbJMEkV8xnrLkEaWRtSz9CosKDYjCJjBRnbJLgp8uirBgmQpjKhoR4tjF3ZpRzrFmBV6UjKdiSZkQUW",
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
                options: { signer: "external-wallet:custom123" },
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
        it("approves a version-1 transaction with a Keypair passed in additionalSigners", async () => {
            const keypair = Keypair.generate();
            const locator = `external-wallet:${keypair.publicKey.toBase58()}`;
            const awaitingApproval = {
                id: "txn-sol-v1",
                status: "awaiting-approval",
                chainType: "solana",
                walletType: "smart",
                onChain: { transaction: "SERIALIZED_V1_TX" },
                approvals: { pending: [{ message: VERSION_1_MESSAGE, signer: { locator } }], submitted: [] },
            } as never;
            mockApiClient.createTransaction.mockResolvedValue(awaitingApproval);
            mockApiClient.getTransaction.mockResolvedValueOnce(awaitingApproval).mockResolvedValue({
                id: "txn-sol-v1",
                status: "success",
                onChain: { txId: "v1-sig", explorerLink: "https://explorer.test/v1" },
            } as never);
            mockApiClient.approveTransaction.mockResolvedValue({ id: "txn-sol-v1", status: "pending" } as never);
            // An api-key wallet signer approves on its own and never consults additional signers.
            const externalWallet = SolanaWallet.from(
                await createMockWallet("solana", mockApiClient, "external-wallet")
            );

            const sendPromise = externalWallet.sendTransaction({
                serializedTransaction: createMockSolanaSerializedTransaction(),
                additionalSigners: [keypair],
            });
            await vi.runAllTimersAsync();
            const result = await sendPromise;

            expect(result.hash).toBe("v1-sig");
            const submitted = mockApiClient.approveTransaction.mock.calls[0][2].approvals[0];
            expect(submitted.signer).toBe(locator);
            expect(
                nacl.sign.detached.verify(
                    bs58.decode(VERSION_1_MESSAGE),
                    bs58.decode(submitted.signature),
                    keypair.publicKey.toBytes()
                )
            ).toBe(true);
        });
    });

    describe("error cases", () => {
        it("throws TransactionNotCreatedError when API returns error", async () => {
            const serializedTx = createMockSolanaSerializedTransaction();
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
            } catch {}
        });

        it("throws error when transaction approval fails", async () => {
            const serializedTx = createMockSolanaSerializedTransaction();
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

    it("creates SolanaWallet from valid Solana wallet", async () => {
        const wallet = await createMockWallet("solana", mockApiClient);
        const solanaWallet = SolanaWallet.from(wallet);

        expect(solanaWallet).toBeInstanceOf(SolanaWallet);
        expect(solanaWallet.chain).toBe("solana");
    });

    it("keeps every recovery signer of the source wallet", async () => {
        const recoverySigners: Array<RecoverySignerConfigForChain<SolanaChain>> = [
            { type: "email", email: "one@test.com" },
            { type: "api-key" },
        ];
        const wallet = await createMockWallet("solana", mockApiClient, "api-key", recoverySigners);

        const solanaWallet = SolanaWallet.from(wallet);

        expect(solanaWallet.recoveryMethods).toEqual(recoverySigners);
        expect(solanaWallet.recovery).toEqual(recoverySigners[0]);
    });

    it("throws error when wallet is not Solana", async () => {
        const { isValidSolanaAddress } = await import("@crossmint/common-sdk-base");
        vi.mocked(isValidSolanaAddress).mockReturnValueOnce(false);

        const evmWallet = await createMockWallet("base-sepolia", mockApiClient);

        expect(() => SolanaWallet.from(evmWallet)).toThrow("Wallet is not a Solana wallet");
    });

    it("throws error when address is invalid Solana address", async () => {
        const { isValidSolanaAddress } = await import("@crossmint/common-sdk-base");
        vi.mocked(isValidSolanaAddress).mockReturnValueOnce(false);

        const invalidWallet = await createMockWallet("solana", mockApiClient);

        expect(() => SolanaWallet.from(invalidWallet)).toThrow("Wallet is not a Solana wallet");
    });
});
