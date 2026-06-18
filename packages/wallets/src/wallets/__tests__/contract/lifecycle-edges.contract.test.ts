/**
 * CHARACTERIZATION (contract) tests for lifecycle edge cases in wallet.ts:
 *   - preAuthIfNeeded #recovering reset semantics when recover() rejects
 *   - waitForSignature's lack of any polling timeout (vs waitForTransaction's 60s cap)
 *   - addSigner resume path silently dropping options.scopes
 *   - approveSignatureInternal pre-approval getSignature error contract
 *   - toRecipientLocator terminal "Invalid recipient locator" branch
 *
 * These tests pin CURRENT behavior — exact error classes, exact message strings,
 * API call counts and timing schedules — ahead of the wallet.ts service extraction.
 * If one of these fails after a refactor, behavior drifted; do not "fix" the test
 * without acknowledging the contract change. Suspected bugs are pinned as-is and
 * marked with "NOTE: suspected bug".
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CrossmintSDKError } from "@crossmint/common-sdk-base";
import type { Wallet } from "../../wallet";
import { SignatureNotAvailableError } from "../../../utils/errors";
import { createMockApiClient, createMockWallet, type MockedApiClient } from "../test-helpers";

const EVM_ADDRESS = "0x1234567890123456789012345678901234567890";

describe("contract: lifecycle-edges", () => {
    let mockApiClient: MockedApiClient;
    let wallet: Wallet<"base-sepolia">;

    beforeEach(async () => {
        vi.clearAllMocks();
        mockApiClient = createMockApiClient();
        wallet = await createMockWallet("base-sepolia", mockApiClient, "api-key");
    });

    describe("preAuthIfNeeded: #recovering reset when recover() rejects", () => {
        // pins wallet.ts preAuthIfNeeded (try/finally around #recovering): a recover() rejection
        // propagates out of the operation, and the finally resets #recovering so a SECOND operation
        // re-invokes recover() (fresh promise — the stale rejected one is NOT reused) and succeeds
        it("send() rejects with the recover() error, then a second send() re-invokes recover() and succeeds", async () => {
            const recoveryError = new Error("recovery exploded");
            const recoverSpy = vi
                .spyOn(wallet, "recover")
                .mockRejectedValueOnce(recoveryError)
                .mockResolvedValue(undefined);

            mockApiClient.send.mockResolvedValue({ id: "tx-after-retry" } as any);

            // First half: the rejection from recover() propagates out of send() UNCHANGED
            const caught = await wallet.send(EVM_ADDRESS, "usdc", "1.0", { prepareOnly: true }).then(
                () => {
                    throw new Error("expected send() to reject");
                },
                (e) => e
            );
            expect(caught).toBe(recoveryError);
            expect(recoverSpy).toHaveBeenCalledTimes(1);
            // pre-auth failed BEFORE the transaction-creation API call
            expect(mockApiClient.send).not.toHaveBeenCalled();

            // Second half: #recovering was reset to null in the finally even though recover()
            // rejected — the retry invokes recover() AGAIN and the operation completes
            const tx = await wallet.send(EVM_ADDRESS, "usdc", "1.0", { prepareOnly: true });
            expect(tx.transactionId).toBe("tx-after-retry");
            expect(recoverSpy).toHaveBeenCalledTimes(2);
            expect(mockApiClient.send).toHaveBeenCalledTimes(1);
        });
    });

    describe("waitForSignature: no polling timeout", () => {
        beforeEach(() => {
            vi.useFakeTimers();
        });

        afterEach(() => {
            vi.useRealTimers();
        });

        // pins wallet.ts waitForSignature: the do/while loop has NO timeout guard — unlike
        // waitForTransaction's 60_000ms default cap, a perpetually-pending signature is polled
        // forever (fixed 500ms interval) and never rejects with a timeout error
        // NOTE: suspected bug — signature polling can hang indefinitely; waitForTransaction times out at 60s
        it("polls a pending signature indefinitely past waitForTransaction's 60s cap and still resolves when it finally succeeds", async () => {
            let response: any = { id: "sig-forever", status: "pending" };
            mockApiClient.getSignature.mockImplementation(async () => response);
            const calls = () => mockApiClient.getSignature.mock.calls.length;

            let captured: any = null;
            let resolved: any = null;
            const promise = wallet.approve({ signatureId: "sig-forever" }).then(
                (v) => {
                    resolved = v;
                },
                (e) => {
                    captured = e;
                }
            );

            // Schedule: pre-check poll at t=0, slow-path sleep(1000), then sleep(500)+poll
            // forever — loop polls land at t=1500, 2000, 2500, ...
            await vi.advanceTimersByTimeAsync(0);
            expect(calls()).toBe(1);

            // Advance to t=121s — double waitForTransaction's 60s cap. No rejection of any
            // kind has fired; the loop just kept polling: 1 pre-check + 240 loop polls.
            await vi.advanceTimersByTimeAsync(121_000);
            expect(captured).toBeNull();
            expect(resolved).toBeNull();
            expect(calls()).toBe(241);

            // Keep going to t=301s (~5 minutes): still no timeout, still a fixed 500ms
            // interval (360 more polls — no backoff growth either)
            await vi.advanceTimersByTimeAsync(180_000);
            expect(captured).toBeNull();
            expect(resolved).toBeNull();
            expect(calls()).toBe(601);

            // Flip to success: the loop exits and resolves with the signature result shape
            response = { id: "sig-forever", status: "success", outputSignature: "0xeventually" };
            await vi.runAllTimersAsync();
            await promise;
            expect(captured).toBeNull();
            expect(resolved).toEqual({ signature: "0xeventually", signatureId: "sig-forever" });
            expect(mockApiClient.getSignature).toHaveBeenCalledWith("me:evm:smart", "sig-forever");
        });
    });

    describe("addSigner resume path: options.scopes dropped", () => {
        // pins wallet.ts addSigner resume branch (existingState.pendingOperation != null):
        // registerSigner is NOT called at all, so options.scopes never reaches the API —
        // the pending operation from the previous attempt is approved instead
        // NOTE: suspected bug — scopes passed to addSigner are silently ignored when an
        // existing pending registration is resumed (only the fresh-registration path forwards them)
        it("addSigner with scopes resumes a pending registration without calling registerSigner (scopes silently dropped)", async () => {
            // addSigner's upfront getSignerState check: existing signer with a pending
            // signature operation on this chain (interrupted previous attempt)
            mockApiClient.getSigner.mockResolvedValue({
                type: "external-wallet",
                address: "0x4560000000000000000000000000000000000000",
                locator: "external-wallet:0x456",
                chains: { "base-sepolia": { status: "awaiting-approval", id: "sig-resume-1" } },
            } as any);
            // resumed approval: api-key recovery signer takes approveSignatureAndWait's
            // fast path (success + outputSignature) — no polling
            mockApiClient.getSignature.mockResolvedValue({
                id: "sig-resume-1",
                status: "success",
                outputSignature: "0xresumedsig",
            } as any);

            const scopes = [
                { type: "transfer" as const, tokenLocator: "base-sepolia:usdc", spendingLimit: { amount: "100" } },
            ];
            const result = await wallet.addSigner({ type: "external-wallet", address: "0x456" } as any, { scopes });

            // resume path: NO registration call → the scopes option never reaches the API
            expect(mockApiClient.registerSigner).not.toHaveBeenCalled();
            // exactly one signer-state lookup (the pre-check), with the derived locator
            expect(mockApiClient.getSigner).toHaveBeenCalledTimes(1);
            expect(mockApiClient.getSigner).toHaveBeenCalledWith("me:evm:smart", "external-wallet:0x456");
            // the pending signature op from the previous attempt is what gets approved
            expect(mockApiClient.getSignature).toHaveBeenCalledWith("me:evm:smart", "sig-resume-1");
            // the resumed signer is returned as approved — and scopes appear NOWHERE in the result
            expect(result).toEqual({
                type: "external-wallet",
                address: "0x4560000000000000000000000000000000000000",
                locator: "external-wallet:0x456",
                status: "success",
            });
            expect("scopes" in (result as any)).toBe(false);
        });
    });

    describe("approveSignatureInternal: pre-approval getSignature error", () => {
        // pins wallet.ts approveSignatureInternal pre-check: an error-shaped getSignature response
        // BEFORE approval → SignatureNotAvailableError whose message is JSON.stringify of the FULL
        // error response (distinct from waitForSignature's identically-classed in-loop variant)
        it("approve({ signatureId }) throws SignatureNotAvailableError with the JSON-stringified error response", async () => {
            const errorResponse = { error: { code: "not_found", message: "signature does not exist" } };
            mockApiClient.getSignature.mockResolvedValue(errorResponse as any);

            const caught = await wallet.approve({ signatureId: "sig-missing" }).then(
                () => {
                    throw new Error("expected approve() to reject");
                },
                (e) => e
            );

            expect(caught).toBeInstanceOf(SignatureNotAvailableError);
            expect((caught as SignatureNotAvailableError).message).toBe(
                '{"error":{"code":"not_found","message":"signature does not exist"}}'
            );
            // failed at the pre-check: a single getSignature call, no approval ever submitted
            expect(mockApiClient.getSignature).toHaveBeenCalledTimes(1);
            expect(mockApiClient.approveSignature).not.toHaveBeenCalled();
        });
    });

    describe("toRecipientLocator: terminal branch", () => {
        // pins wallet.ts toRecipientLocator: a recipient object with none of email/x/twitter/phone/userId
        // falls through every key check → plain Error("Invalid recipient locator"), surfaced via send()
        it("send() with an unrecognized recipient locator object rejects with Error('Invalid recipient locator')", async () => {
            const caught = await wallet.send({ telegram: "someuser" } as any, "usdc", "1.0").then(
                () => {
                    throw new Error("expected send() to reject");
                },
                (e) => e
            );

            expect(caught).toBeInstanceOf(Error);
            // plain Error — NOT a CrossmintSDKError subclass like InvalidAddressError
            expect((caught as Error).constructor).toBe(Error);
            expect(caught).not.toBeInstanceOf(CrossmintSDKError);
            expect((caught as Error).message).toBe("Invalid recipient locator");
            // thrown before any pre-auth or API work
            expect(mockApiClient.send).not.toHaveBeenCalled();
            expect(mockApiClient.getSigner).not.toHaveBeenCalled();
        });
    });
});
