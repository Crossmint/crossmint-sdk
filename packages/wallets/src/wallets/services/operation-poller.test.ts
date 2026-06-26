import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ApiClient, WalletLocator } from "../../api";
import {
    SignatureConfirmationTimeoutError,
    SignatureNotAvailableError,
    SigningFailedError,
    TransactionAwaitingApprovalError,
    TransactionConfirmationTimeoutError,
    TransactionHashNotFoundError,
    TransactionNotAvailableError,
    TransactionSendingFailedError,
} from "../../utils/errors";
import { walletsLogger } from "../../logger";
import { waitForSignatureCompletion, waitForTransactionCompletion } from "./operation-poller";

const WALLET_LOCATOR = "me:evm:smart" as WalletLocator;

const txSuccess = (id: string, onChain: Record<string, unknown>) => ({ id, status: "success", onChain }) as any;

// The rejection handler is attached before timers run so vitest never sees an unhandled rejection.
async function settleWithTimers<T>(promise: Promise<T>): Promise<{ ok: true; value: T } | { ok: false; error: any }> {
    const outcome = promise.then(
        (value) => ({ ok: true as const, value }),
        (error) => ({ ok: false as const, error })
    );
    await vi.runAllTimersAsync();
    return await outcome;
}

async function settleError(promise: Promise<unknown>): Promise<any> {
    const result = await settleWithTimers(promise);
    expect(result.ok).toBe(false);
    return result.ok ? undefined : result.error;
}

async function settleValue<T>(promise: Promise<T>): Promise<T> {
    const result = await settleWithTimers(promise);
    expect(result.ok).toBe(true);
    return result.ok ? result.value : Promise.reject(result.error);
}

describe("operation-poller", () => {
    let mockApiClient: { getTransaction: ReturnType<typeof vi.fn>; getSignature: ReturnType<typeof vi.fn> };
    const apiClient = () => mockApiClient as unknown as ApiClient;

    beforeEach(() => {
        vi.clearAllMocks();
        vi.useFakeTimers();
        mockApiClient = { getTransaction: vi.fn(), getSignature: vi.fn() };
    });
    afterEach(() => vi.useRealTimers());

    describe("waitForTransactionCompletion", () => {
        const pollTx = (id: string, options?: { timeoutMs?: number }) =>
            waitForTransactionCompletion(apiClient(), WALLET_LOCATOR, id, options);

        it("throws TransactionConfirmationTimeoutError only after timeoutMs is strictly exceeded", async () => {
            mockApiClient.getTransaction.mockResolvedValue({ id: "txn-timeout", status: "pending" } as any);
            let captured: any = null;
            const promise = pollTx("txn-timeout").catch((e) => (captured = e));

            await vi.advanceTimersByTimeAsync(60_000);
            expect(captured).toBeNull();
            await vi.runAllTimersAsync();
            await promise;

            expect(captured).toBeInstanceOf(TransactionConfirmationTimeoutError);
            expect(captured.message).toBe("Transaction confirmation timeout");
            expect(mockApiClient.getTransaction.mock.calls.length).toBeGreaterThan(5);
        });

        it("logs 'wallet.approve: waiting for transaction confirmation' with transactionId and timeoutMs", async () => {
            mockApiClient.getTransaction.mockResolvedValue(txSuccess("txn-log", { txId: "0xhash" }));
            await settleValue(pollTx("txn-log"));
            expect(walletsLogger.info).toHaveBeenCalledWith("wallet.approve: waiting for transaction confirmation", {
                transactionId: "txn-log",
                timeoutMs: 60_000,
            });
        });

        it("honors a custom timeoutMs option", async () => {
            mockApiClient.getTransaction.mockResolvedValue({ id: "txn-short", status: "pending" } as any);
            const error = await settleError(pollTx("txn-short", { timeoutMs: 1_000 }));
            expect(error).toBeInstanceOf(TransactionConfirmationTimeoutError);
            expect(walletsLogger.info).toHaveBeenCalledWith("wallet.approve: waiting for transaction confirmation", {
                transactionId: "txn-short",
                timeoutMs: 1_000,
            });
        });

        it.each([
            {
                title: "throws TransactionSendingFailedError including the failed response payload when status is failed",
                response: { id: "txn-fail", status: "failed" } as any,
                errorClass: TransactionSendingFailedError,
                message: 'Transaction sending failed: {"id":"txn-fail","status":"failed"}',
            },
            {
                title: "throws TransactionAwaitingApprovalError when transaction is awaiting-approval",
                response: { id: "txn-await", status: "awaiting-approval" } as any,
                errorClass: TransactionAwaitingApprovalError,
                message:
                    "Transaction is awaiting approval. Please submit required approvals before waiting for completion.",
            },
            {
                title: "throws TransactionHashNotFoundError when success response has neither txId nor txHash",
                response: txSuccess("txn-nohash", {}),
                errorClass: TransactionHashNotFoundError,
                message: "Transaction hash not found on transaction response",
            },
            {
                title: "ignores a non-string txHash and throws TransactionHashNotFoundError",
                response: txSuccess("txn-numhash", { txHash: 12345 }),
                errorClass: TransactionHashNotFoundError,
                message: "Transaction hash not found on transaction response",
            },
        ])("$title", async ({ response, errorClass, message }) => {
            mockApiClient.getTransaction.mockResolvedValue(response);
            const error = await settleError(pollTx(response.id));
            expect(error).toBeInstanceOf(errorClass);
            expect(error.message).toBe(message);
        });

        it("polls getTransaction repeatedly with backoff growth capped at maxBackoffMs until status is no longer pending", async () => {
            let response: any = { id: "txn-loop", status: "pending" };
            mockApiClient.getTransaction.mockImplementation(async () => response);
            const calls = () => mockApiClient.getTransaction.mock.calls.length;
            const promise = pollTx("txn-loop");

            await vi.advanceTimersByTimeAsync(0); // t=0
            expect(calls()).toBe(1);

            await vi.advanceTimersByTimeAsync(199); // t=199
            expect(calls()).toBe(1);
            await vi.advanceTimersByTimeAsync(1); // t=200
            expect(calls()).toBe(2);

            await vi.advanceTimersByTimeAsync(219); // t=419
            expect(calls()).toBe(2);
            await vi.advanceTimersByTimeAsync(1); // t=420
            expect(calls()).toBe(3);

            await vi.advanceTimersByTimeAsync(241); // t=661
            expect(calls()).toBe(3);
            await vi.advanceTimersByTimeAsync(1); // t=662
            expect(calls()).toBe(4);

            await vi.advanceTimersByTimeAsync(28_343); // t=30_000
            const callsAt30s = calls();
            expect(callsAt30s).toBeGreaterThan(20);
            await vi.advanceTimersByTimeAsync(8_000); // t=38_000
            expect(calls()).toBeGreaterThan(callsAt30s);

            response = txSuccess("txn-loop", {
                txId: "0xfinalhash",
                explorerLink: "https://explorer.example.com/tx/0xfinalhash",
            });
            await vi.runAllTimersAsync();
            expect(await promise).toEqual({
                hash: "0xfinalhash",
                explorerLink: "https://explorer.example.com/tx/0xfinalhash",
                transactionId: "txn-loop",
            });
            expect(calls()).toBe(callsAt30s + 5);
            expect(mockApiClient.getTransaction).toHaveBeenCalledWith("me:evm:smart", "txn-loop");
        });

        it("throws TransactionNotAvailableError when getTransaction returns an error mid-polling", async () => {
            const errorResponse = { id: "txn-err", status: "failed", error: { message: "execution reverted" } };
            mockApiClient.getTransaction
                .mockResolvedValueOnce({ id: "txn-err", status: "pending" } as any)
                .mockResolvedValue(errorResponse as any);
            const error = await settleError(pollTx("txn-err"));
            expect(error).toBeInstanceOf(TransactionNotAvailableError);
            expect(error.message).toBe(JSON.stringify(errorResponse));
            expect(mockApiClient.getTransaction).toHaveBeenCalledTimes(2);
        });

        it.each([
            {
                title: "falls back to onChain.txHash for the returned hash when txId is absent",
                response: txSuccess("txn-stellar", { txHash: "stellar-tx-hash-abc123" }),
                expectedHash: "stellar-tx-hash-abc123",
            },
            {
                title: "prefers onChain.txId over txHash when both are present",
                response: txSuccess("txn-both", { txId: "the-tx-id", txHash: "the-tx-hash" }),
                expectedHash: "the-tx-id",
            },
        ])("$title", async ({ response, expectedHash }) => {
            mockApiClient.getTransaction.mockResolvedValue(response);
            const value = await settleValue(pollTx(response.id));
            expect(value.hash).toBe(expectedHash);
        });

        it("returns explorerLink from onChain and defaults to empty string when missing", async () => {
            mockApiClient.getTransaction.mockResolvedValue(
                txSuccess("txn-link", { txId: "0xhash1", explorerLink: "https://explorer.example.com/tx/0xhash1" })
            );
            expect(await settleValue(pollTx("txn-link"))).toEqual({
                hash: "0xhash1",
                explorerLink: "https://explorer.example.com/tx/0xhash1",
                transactionId: "txn-link",
            });

            mockApiClient.getTransaction.mockResolvedValue(txSuccess("txn-nolink", { txId: "0xhash2" }));
            expect(await settleValue(pollTx("txn-nolink"))).toEqual({
                hash: "0xhash2",
                explorerLink: "",
                transactionId: "txn-nolink",
            });
        });
    });

    describe("waitForSignatureCompletion", () => {
        const pollSig = (id: string) => waitForSignatureCompletion(apiClient(), WALLET_LOCATOR, id);

        it.each([
            {
                title: "throws SigningFailedError when signature status is failed",
                response: { id: "sig-fail", status: "failed" } as any,
                errorClass: SigningFailedError,
                message: "Signature signing failed",
            },
            {
                title: "throws SignatureNotAvailableError('Signature not available') when success response lacks outputSignature",
                response: { id: "sig-nosig", status: "success" } as any,
                errorClass: SignatureNotAvailableError,
                message: "Signature not available",
            },
        ])("$title", async ({ response, errorClass, message }) => {
            mockApiClient.getSignature.mockResolvedValue(response);
            const error = await settleError(pollSig(response.id));
            expect(error).toBeInstanceOf(errorClass);
            expect(error.message).toBe(message);
        });

        it("sleeps before each poll and polls getSignature on a fixed interval with no backoff", async () => {
            mockApiClient.getSignature
                .mockResolvedValueOnce({ id: "sig-loop", status: "pending" } as any)
                .mockResolvedValueOnce({ id: "sig-loop", status: "pending" } as any)
                .mockResolvedValue({ id: "sig-loop", status: "success", outputSignature: "0xpolledsig" } as any);
            const calls = () => mockApiClient.getSignature.mock.calls.length;
            const promise = pollSig("sig-loop");

            await vi.advanceTimersByTimeAsync(0);
            expect(calls()).toBe(0);
            await vi.advanceTimersByTimeAsync(199); // t=199
            expect(calls()).toBe(0);
            await vi.advanceTimersByTimeAsync(1); // t=200
            expect(calls()).toBe(1);

            await vi.advanceTimersByTimeAsync(199); // t=399
            expect(calls()).toBe(1);
            await vi.advanceTimersByTimeAsync(1); // t=400
            expect(calls()).toBe(2);
            await vi.advanceTimersByTimeAsync(200); // t=600
            expect(calls()).toBe(3);

            await vi.advanceTimersByTimeAsync(0);
            expect(await promise).toEqual({ signature: "0xpolledsig", signatureId: "sig-loop" });
            expect(calls()).toBe(3);
            expect(mockApiClient.getSignature).toHaveBeenCalledWith("me:evm:smart", "sig-loop");
        });

        it("times out after the default 60s when the signature stays pending", async () => {
            mockApiClient.getSignature.mockResolvedValue({ id: "sig-forever", status: "pending" } as any);
            const error = await settleError(pollSig("sig-forever"));
            expect(error).toBeInstanceOf(SignatureConfirmationTimeoutError);
            expect(error.message).toBe("Signature confirmation timeout");
        });

        it("throws SignatureNotAvailableError when getSignature returns an error during polling", async () => {
            const errorResponse = { error: { message: "signature exploded" } };
            mockApiClient.getSignature
                .mockResolvedValueOnce({ id: "sig-err", status: "pending" } as any)
                .mockResolvedValue(errorResponse as any);
            const error = await settleError(pollSig("sig-err"));
            expect(error).toBeInstanceOf(SignatureNotAvailableError);
            expect(error.message).toBe(JSON.stringify(errorResponse));
            expect(mockApiClient.getSignature).toHaveBeenCalledTimes(2);
        });
    });
});
