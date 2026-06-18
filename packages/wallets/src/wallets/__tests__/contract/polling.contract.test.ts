/**
 * CHARACTERIZATION (contract) tests for the polling ORCHESTRATION of Wallet
 * (approveTransactionAndWait / approveSignatureAndWait around the extracted
 * operation-poller service).
 *
 * These tests pin CURRENT behavior — API call counts and the wallet-level timing
 * schedule — ahead of the wallet.ts service extraction. If one of these fails
 * after a refactor, behavior drifted; do not "fix" the test without
 * acknowledging the contract change.
 *
 * Phase 1 migration note: the pure polling-loop pins (terminal status branches,
 * exact error classes/messages, hash resolution, explorerLink defaults, the
 * unbounded signature loop) moved to
 * src/wallets/services/operation-poller.test.ts, colocated with the extracted
 * waitForTransactionCompletion / waitForSignatureCompletion. What stays here is
 * Wallet-level orchestration only:
 *   - transactions: getTransaction #1 (approveTransactionInternal pre-check) ->
 *     the 1s post-approval sleep -> the poller loop (poll first, then sleep with
 *     backoff) with the DEFAULT 60s timeout (approve() passes no override)
 *   - signatures: getSignature #1 (approveSignatureInternal pre-check) ->
 *     [fast path return | sleep(1000) -> poller loop (sleep first, then poll)]
 * exercised through the public `wallet.approve()` API with an api-key signer.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Wallet } from "../../wallet";
import { TransactionConfirmationTimeoutError } from "../../../utils/errors";
import { createMockApiClient, createMockWallet, type MockedApiClient } from "../test-helpers";

describe("contract: polling", () => {
    let mockApiClient: MockedApiClient;
    let wallet: Wallet<"base-sepolia">;

    beforeEach(async () => {
        vi.clearAllMocks();
        vi.useFakeTimers();
        mockApiClient = createMockApiClient();
        wallet = await createMockWallet("base-sepolia", mockApiClient, "api-key");
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    describe("waitForTransaction (via wallet.approve({ transactionId }))", () => {
        // pins wallet.ts ORCHESTRATION: approve() runs the poller with the DEFAULT timeoutMs
        // (60_000 — no override is passed), and the poller's clock starts only AFTER the 1s
        // post-approval sleep. The timeout guard semantics themselves (strict `> timeoutMs`,
        // top-of-loop evaluation) are pinned in services/operation-poller.test.ts.
        it("throws TransactionConfirmationTimeoutError when transaction stays pending past timeoutMs", async () => {
            mockApiClient.getTransaction.mockResolvedValue({ id: "txn-timeout", status: "pending" } as any);

            let captured: any = null;
            const promise = wallet.approve({ transactionId: "txn-timeout" }).catch((e) => {
                captured = e;
            });

            // waitForTransaction's clock starts after the 1s post-approval sleep (t=1000).
            // The guard is strict (`> timeoutMs`) and only evaluated at the top of each
            // loop iteration, so at exactly 60s of polling nothing has thrown yet.
            await vi.advanceTimersByTimeAsync(61_000);
            expect(captured).toBeNull();

            await vi.runAllTimersAsync();
            await promise;

            expect(captured).toBeInstanceOf(TransactionConfirmationTimeoutError);
            expect(captured.message).toBe("Transaction confirmation timeout");
            // the loop actually polled repeatedly before timing out
            expect(mockApiClient.getTransaction.mock.calls.length).toBeGreaterThan(5);
        });

        // pins wallet.ts ORCHESTRATION: the approveTransactionInternal pre-check poll at t=0,
        // the 1s post-approval sleep before the poller starts, the wallet locator passed to
        // getTransaction, and approve()'s result shape. The backoff growth/cap schedule is
        // also asserted end-to-end here (offset by the wallet's 1s sleep); the loop-local
        // schedule is pinned in services/operation-poller.test.ts.
        it("polls getTransaction repeatedly with backoff growth capped at maxBackoffMs until status is no longer pending", async () => {
            let response: any = { id: "txn-loop", status: "pending" };
            mockApiClient.getTransaction.mockImplementation(async () => response);
            const calls = () => mockApiClient.getTransaction.mock.calls.length;

            const promise = wallet.approve({ transactionId: "txn-loop" });

            // t=0: only the approveTransactionInternal pre-check has run
            await vi.advanceTimersByTimeAsync(0);
            expect(calls()).toBe(1);

            // 1s post-approval sleep; first loop poll happens IMMEDIATELY after it (no pre-poll sleep)
            await vi.advanceTimersByTimeAsync(999); // t=999
            expect(calls()).toBe(1);
            await vi.advanceTimersByTimeAsync(1); // t=1000
            expect(calls()).toBe(2);

            // interval 1: exactly 500ms (STATUS_POLLING_INTERVAL_MS)
            await vi.advanceTimersByTimeAsync(499); // t=1499
            expect(calls()).toBe(2);
            await vi.advanceTimersByTimeAsync(1); // t=1500
            expect(calls()).toBe(3);

            // interval 2: grew by 1.1x to 550ms (small slop for float accumulation)
            await vi.advanceTimersByTimeAsync(549); // t=2049
            expect(calls()).toBe(3);
            await vi.advanceTimersByTimeAsync(2); // t=2051
            expect(calls()).toBe(4);

            // interval 3: 605ms
            await vi.advanceTimersByTimeAsync(603); // t=2654
            expect(calls()).toBe(4);
            await vi.advanceTimersByTimeAsync(3); // t=2657
            expect(calls()).toBe(5);

            // Backoff reaches the 2_000ms cap around the 16th loop poll (~t=16.9s).
            // Pin the cumulative schedule at t=31s, then pin the steady-state cap:
            // exactly 4 polls in the following 8s window (8000 / 2000).
            await vi.advanceTimersByTimeAsync(28_343); // t=31_000
            const callsAt31s = calls();
            expect(callsAt31s).toBe(24);
            await vi.advanceTimersByTimeAsync(8_000); // t=39_000
            expect(calls()).toBe(callsAt31s + 4);

            // Flip to success: the loop exits and the promise resolves with the mapped shape.
            response = {
                id: "txn-loop",
                status: "success",
                onChain: { txId: "0xfinalhash", explorerLink: "https://explorer.example.com/tx/0xfinalhash" },
            };
            await vi.runAllTimersAsync();
            const result = await promise;
            expect(result).toEqual({
                hash: "0xfinalhash",
                explorerLink: "https://explorer.example.com/tx/0xfinalhash",
                transactionId: "txn-loop",
            });
            // exactly one more poll observed the terminal status; polling then stopped
            expect(calls()).toBe(callsAt31s + 5);
            expect(mockApiClient.getTransaction).toHaveBeenCalledWith("me:evm:smart", "txn-loop");
        });
    });

    describe("waitForSignature (via wallet.approve({ signatureId }))", () => {
        // pins wallet.ts ORCHESTRATION: the approveSignatureInternal pre-check poll at t=0,
        // the 1s slow-path sleep, the wallet locator passed to getSignature, and the
        // { signature, signatureId } result shape through approve(). The loop-local
        // sleep-before-poll / fixed-interval semantics are pinned in
        // services/operation-poller.test.ts.
        it("polls getSignature every STATUS_POLLING_INTERVAL_MS while pending and resolves with signature on success", async () => {
            mockApiClient.getSignature
                .mockResolvedValueOnce({ id: "sig-loop", status: "pending" } as any) // pre-check -> slow path
                .mockResolvedValueOnce({ id: "sig-loop", status: "pending" } as any) // loop poll 1 (t=1500)
                .mockResolvedValueOnce({ id: "sig-loop", status: "pending" } as any) // loop poll 2 (t=2000)
                .mockResolvedValue({ id: "sig-loop", status: "success", outputSignature: "0xpolledsig" } as any);
            const calls = () => mockApiClient.getSignature.mock.calls.length;

            const promise = wallet.approve({ signatureId: "sig-loop" });

            // t=0: only the approveSignatureInternal pre-check has run
            await vi.advanceTimersByTimeAsync(0);
            expect(calls()).toBe(1);

            // 1s slow-path sleep PLUS the loop's sleep-before-first-poll: nothing until t=1500
            await vi.advanceTimersByTimeAsync(1_499); // t=1499
            expect(calls()).toBe(1);
            await vi.advanceTimersByTimeAsync(1); // t=1500
            expect(calls()).toBe(2);

            // fixed 500ms interval — no backoff growth
            await vi.advanceTimersByTimeAsync(499); // t=1999
            expect(calls()).toBe(2);
            await vi.advanceTimersByTimeAsync(1); // t=2000
            expect(calls()).toBe(3);
            await vi.advanceTimersByTimeAsync(500); // t=2500
            expect(calls()).toBe(4);

            // success poll exits the loop with no further sleep
            await vi.advanceTimersByTimeAsync(0);
            const result = await promise;
            expect(result).toEqual({ signature: "0xpolledsig", signatureId: "sig-loop" });
            expect(calls()).toBe(4);
            expect(mockApiClient.getSignature).toHaveBeenCalledWith("me:evm:smart", "sig-loop");
        });

        // pins wallet.ts approveSignatureAndWait ORCHESTRATION: slow path — a
        // non-(success+outputSignature) approval response sleeps 1s then delegates to
        // waitForSignature and returns its result
        it("approveSignatureAndWait falls back to polling waitForSignature when approval response is not yet success", async () => {
            mockApiClient.getSignature
                // approval response: success but outputSignature null => fast path is skipped
                .mockResolvedValueOnce({ id: "sig-slow", status: "success", outputSignature: null } as any)
                .mockResolvedValue({ id: "sig-slow", status: "success", outputSignature: "0xeventualsig" } as any);
            const calls = () => mockApiClient.getSignature.mock.calls.length;

            const promise = wallet.approve({ signatureId: "sig-slow" });

            await vi.advanceTimersByTimeAsync(0);
            expect(calls()).toBe(1);

            // observable timing: 1_000ms pre-poll sleep + 500ms sleep-before-poll
            await vi.advanceTimersByTimeAsync(1_499); // t=1499
            expect(calls()).toBe(1);
            await vi.advanceTimersByTimeAsync(1); // t=1500
            expect(calls()).toBe(2);

            const result = await promise;
            expect(result).toEqual({ signature: "0xeventualsig", signatureId: "sig-slow" });
        });
    });
});
