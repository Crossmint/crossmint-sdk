/**
 * CHARACTERIZATION (contract) tests for the Wallet approval engine.
 *
 * These tests pin the CURRENT behavior of wallet.ts (approve dispatch,
 * approveTransactionInternal / approveSignatureInternal signing loops,
 * executeApprove*WithErrorHandling error wrapping, signer matching, and
 * exact error classes + message strings) before the planned service
 * decomposition. Do NOT "fix" behavior here — if a test fails after a
 * refactor, the refactor drifted.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Wallet } from "../../wallet";
import type { ApiClient } from "../../../api";
import type { SignerAdapter, SignerConfigForChain } from "../../../signers/types";
import {
    InvalidSignerError,
    SignatureFailedError,
    TransactionFailedError,
    TransactionNotAvailableError,
} from "../../../utils/errors";
import { createMockApiClient, createMockWallet, type MockedApiClient } from "../test-helpers";

/** Locator of the wallet signer assembled by createMockWallet(..., "external-wallet") on EVM. */
const EVM_EXTERNAL_SIGNER_LOCATOR = "external-wallet:0x123";

/** Builds a fake SignerAdapter for use as options.additionalSigners. */
function makeFakeSigner(type: string, locator: string, signature: string) {
    return {
        type,
        locator: () => locator,
        signMessage: vi.fn().mockResolvedValue({ signature }),
        signTransaction: vi.fn().mockResolvedValue({ signature }),
    };
}

function asAdapter(fake: ReturnType<typeof makeFakeSigner>): SignerAdapter {
    return fake as unknown as SignerAdapter;
}

function evmPendingTx(id: string, pending: Array<{ message: string; signer: { locator: string } }>) {
    return {
        id,
        status: "awaiting-approval",
        chainType: "evm",
        walletType: "smart",
        onChain: {},
        approvals: { pending, submitted: [] },
    };
}

function successTx(id: string) {
    return {
        id,
        status: "success",
        onChain: { txId: "0xabcdef", explorerLink: "https://explorer.test/tx/0xabcdef" },
    };
}

async function captureRejection(promise: Promise<unknown>): Promise<any> {
    try {
        await promise;
    } catch (error) {
        return error;
    }
    throw new Error("Expected promise to reject, but it resolved");
}

describe("contract: approval-engine", () => {
    let mockApiClient: MockedApiClient;

    beforeEach(() => {
        vi.clearAllMocks();
        vi.useFakeTimers();
        mockApiClient = createMockApiClient();
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    describe("transaction pending-approval signing loop", () => {
        // pins wallet.ts approveTransactionInternal: signs each pendingApproval.message via walletSigner.signTransaction and submits { ...signature, signer: locator } to approveTransaction
        it("submits signed approvals to approveTransaction with { ...signature, signer: locator } when transaction has pending approvals", async () => {
            const wallet = await createMockWallet("base-sepolia", mockApiClient, "external-wallet");
            // biome-ignore lint/style/noNonNullAssertion: signer is set by createMockWallet
            const signSpy = vi.spyOn(wallet.signer!, "signTransaction");

            mockApiClient.getTransaction
                .mockResolvedValueOnce(
                    evmPendingTx("txn-pending", [
                        { message: "0xdeadbeef", signer: { locator: EVM_EXTERNAL_SIGNER_LOCATOR } },
                    ]) as any
                )
                .mockResolvedValue(successTx("txn-pending") as any);
            mockApiClient.approveTransaction.mockResolvedValue({ id: "txn-pending", status: "pending" } as any);

            const approvePromise = wallet.approve({ transactionId: "txn-pending" });
            await vi.runAllTimersAsync();
            const result = await approvePromise;

            expect(signSpy).toHaveBeenCalledTimes(1);
            expect(signSpy).toHaveBeenCalledWith("0xdeadbeef");
            expect(mockApiClient.approveTransaction).toHaveBeenCalledTimes(1);
            expect(mockApiClient.approveTransaction).toHaveBeenCalledWith("me:evm:smart", "txn-pending", {
                approvals: [{ signature: "0xsigned", signer: EVM_EXTERNAL_SIGNER_LOCATOR }],
            });
            expect(result.hash).toBe("0xabcdef");
            expect(result.transactionId).toBe("txn-pending");
        });

        // pins wallet.ts approveTransactionInternal solana branch: non-device signers sign onChain.transaction (serialized, ed25519); device signers sign pendingApproval.message (secp256r1)
        it("solana: signs serialized onChain.transaction for ed25519 signers but pendingApproval.message for device signers", async () => {
            const solanaWallet = await createMockWallet("solana", mockApiClient, "external-wallet");
            const ed25519Signer = makeFakeSigner("external-wallet", "external-wallet:EdSignerLocator", "ed-sig");
            const deviceSigner = makeFakeSigner("device", "device:DeviceSignerLocator", "device-sig");

            mockApiClient.getTransaction
                .mockResolvedValueOnce({
                    id: "sol-txn",
                    status: "awaiting-approval",
                    chainType: "solana",
                    walletType: "smart",
                    onChain: { transaction: "SERIALIZED_SOLANA_TX" },
                    approvals: {
                        pending: [
                            { message: "msg-for-ed25519", signer: { locator: "external-wallet:EdSignerLocator" } },
                            { message: "msg-for-device", signer: { locator: "device:DeviceSignerLocator" } },
                        ],
                        submitted: [],
                    },
                } as any)
                .mockResolvedValue({
                    id: "sol-txn",
                    status: "success",
                    onChain: { txId: "sol-tx-hash", explorerLink: "https://explorer.solana.com/tx/sol-tx-hash" },
                } as any);
            mockApiClient.approveTransaction.mockResolvedValue({ id: "sol-txn", status: "pending" } as any);

            const approvePromise = solanaWallet.approve({
                transactionId: "sol-txn",
                options: { additionalSigners: [asAdapter(ed25519Signer), asAdapter(deviceSigner)] },
            });
            await vi.runAllTimersAsync();
            await approvePromise;

            // ed25519 (non-device) signer receives the full serialized transaction
            expect(ed25519Signer.signTransaction).toHaveBeenCalledWith("SERIALIZED_SOLANA_TX");
            // device signer receives the pendingApproval.message (keccak256 hash for SWIG precompile)
            expect(deviceSigner.signTransaction).toHaveBeenCalledWith("msg-for-device");
            expect(mockApiClient.approveTransaction).toHaveBeenCalledWith("me:solana:smart", "sol-txn", {
                approvals: [
                    { signature: "ed-sig", signer: "external-wallet:EdSignerLocator" },
                    { signature: "device-sig", signer: "device:DeviceSignerLocator" },
                ],
            });
        });

        // pins wallet.ts approveTransactionInternal: additionalSigners are matched by locator() and shadow the wallet signer ([...additionalSigners, walletSigner] find-first order)
        it("matches options.additionalSigners against pending approvals, shadowing the wallet signer on locator collision", async () => {
            const wallet = await createMockWallet("base-sepolia", mockApiClient, "external-wallet");
            // biome-ignore lint/style/noNonNullAssertion: signer is set by createMockWallet
            const walletSignerSpy = vi.spyOn(wallet.signer!, "signTransaction");
            // Same locator as the wallet signer — additional signers are concatenated first, so this one wins
            const shadowingSigner = makeFakeSigner("external-wallet", EVM_EXTERNAL_SIGNER_LOCATOR, "0xfrom-additional");

            mockApiClient.getTransaction
                .mockResolvedValueOnce(
                    evmPendingTx("txn-shadow", [
                        { message: "0xshadowmsg", signer: { locator: EVM_EXTERNAL_SIGNER_LOCATOR } },
                    ]) as any
                )
                .mockResolvedValue(successTx("txn-shadow") as any);
            mockApiClient.approveTransaction.mockResolvedValue({ id: "txn-shadow", status: "pending" } as any);

            const approvePromise = wallet.approve({
                transactionId: "txn-shadow",
                options: { additionalSigners: [asAdapter(shadowingSigner)] },
            });
            await vi.runAllTimersAsync();
            await approvePromise;

            expect(shadowingSigner.signTransaction).toHaveBeenCalledWith("0xshadowmsg");
            expect(walletSignerSpy).not.toHaveBeenCalled();
            expect(mockApiClient.approveTransaction).toHaveBeenCalledWith("me:evm:smart", "txn-shadow", {
                approvals: [{ signature: "0xfrom-additional", signer: EVM_EXTERNAL_SIGNER_LOCATOR }],
            });
        });

        // pins wallet.ts approveTransactionInternal: unmatched pendingApproval.signer.locator throws InvalidSignerError with the interpolated locator
        it("throws InvalidSignerError when a transaction pending approval has no matching signer", async () => {
            const wallet = await createMockWallet("base-sepolia", mockApiClient, "external-wallet");

            mockApiClient.getTransaction.mockResolvedValue(
                evmPendingTx("txn-ghost", [{ message: "0xmsg", signer: { locator: "external-wallet:0xGhost" } }]) as any
            );

            const error = await captureRejection(wallet.approve({ transactionId: "txn-ghost" }));

            expect(error).toBeInstanceOf(InvalidSignerError);
            expect(error.message).toBe("Signer external-wallet:0xGhost not found in pending approvals");
            expect(mockApiClient.approveTransaction).not.toHaveBeenCalled();
        });
    });

    describe("approval submission error wrapping (executeApprove*WithErrorHandling)", () => {
        // pins wallet.ts executeApproveTransactionWithErrorHandling: response.error → TransactionFailedError(JSON.stringify(response))
        it("throws TransactionFailedError with stringified response when approveTransaction API returns error", async () => {
            const wallet = await createMockWallet("base-sepolia", mockApiClient, "external-wallet");
            const errorResponse = { error: { message: "approval rejected by policy" } };

            mockApiClient.getTransaction.mockResolvedValue(
                evmPendingTx("txn-fail", [
                    { message: "0xdeadbeef", signer: { locator: EVM_EXTERNAL_SIGNER_LOCATOR } },
                ]) as any
            );
            mockApiClient.approveTransaction.mockResolvedValue(errorResponse as any);

            const error = await captureRejection(wallet.approve({ transactionId: "txn-fail" }));

            expect(error).toBeInstanceOf(TransactionFailedError);
            expect(error.message).toBe(JSON.stringify(errorResponse));
        });

        // pins wallet.ts executeApproveSignatureWithErrorHandling: response.error → SignatureFailedError(JSON.stringify(response))
        it("throws SignatureFailedError with stringified response when approveSignature API returns error", async () => {
            const wallet = await createMockWallet("base-sepolia", mockApiClient, "external-wallet");
            const errorResponse = { error: { message: "signature approval rejected" } };

            mockApiClient.getSignature.mockResolvedValue({
                id: "sig-fail",
                status: "awaiting-approval",
                approvals: {
                    pending: [{ message: "0xsigmsg", signer: { locator: EVM_EXTERNAL_SIGNER_LOCATOR } }],
                    submitted: [],
                },
            } as any);
            mockApiClient.approveSignature.mockResolvedValue(errorResponse as any);

            const error = await captureRejection(wallet.approve({ signatureId: "sig-fail" }));

            expect(error).toBeInstanceOf(SignatureFailedError);
            expect(error.message).toBe(JSON.stringify(errorResponse));
        });
    });

    describe("signature approval (approveSignatureInternal)", () => {
        // pins wallet.ts approveSignatureInternal: solana guard throws plain Error before any API call
        it("approve({ signatureId }) on a solana wallet throws 'Approving signatures is only supported for EVM smart wallets' without calling the API", async () => {
            const solanaWallet = await createMockWallet("solana", mockApiClient, "api-key");

            const error = await captureRejection(solanaWallet.approve({ signatureId: "sig-sol" }));

            expect(error).toBeInstanceOf(Error);
            expect(error.message).toBe("Approving signatures is only supported for EVM smart wallets");
            expect(mockApiClient.getSignature).not.toHaveBeenCalled();
            expect(mockApiClient.approveSignature).not.toHaveBeenCalled();
        });

        // pins wallet.ts approveSignatureInternal: unmatched pendingApproval.signer.locator throws InvalidSignerError (duplicate of the transaction-path block)
        it("throws InvalidSignerError when a signature pending approval has no matching signer", async () => {
            const wallet = await createMockWallet("base-sepolia", mockApiClient, "external-wallet");

            mockApiClient.getSignature.mockResolvedValue({
                id: "sig-ghost",
                status: "awaiting-approval",
                approvals: {
                    pending: [{ message: "0xmsg", signer: { locator: "external-wallet:0xGhost" } }],
                    submitted: [],
                },
            } as any);

            const error = await captureRejection(wallet.approve({ signatureId: "sig-ghost" }));

            expect(error).toBeInstanceOf(InvalidSignerError);
            expect(error.message).toBe("Signer external-wallet:0xGhost not found in pending approvals");
            expect(mockApiClient.approveSignature).not.toHaveBeenCalled();
        });

        // pins wallet.ts approveSignatureInternal: pendingApproval.message is signed via signMessage and submitted as { ...signature, signer: locator }
        it("submits signed signature approvals to approveSignature with { ...signature, signer: locator }", async () => {
            const wallet = await createMockWallet("base-sepolia", mockApiClient, "external-wallet");
            // biome-ignore lint/style/noNonNullAssertion: signer is set by createMockWallet
            const signMessageSpy = vi.spyOn(wallet.signer!, "signMessage");

            mockApiClient.getSignature.mockResolvedValue({
                id: "sig-pending",
                status: "awaiting-approval",
                approvals: {
                    pending: [{ message: "0xsigmsg", signer: { locator: EVM_EXTERNAL_SIGNER_LOCATOR } }],
                    submitted: [],
                },
            } as any);
            mockApiClient.approveSignature.mockResolvedValue({
                id: "sig-pending",
                status: "success",
                outputSignature: "0xfinalsig",
            } as any);

            const result = await wallet.approve({ signatureId: "sig-pending" });

            expect(signMessageSpy).toHaveBeenCalledWith("0xsigmsg");
            expect(mockApiClient.approveSignature).toHaveBeenCalledWith("me:evm:smart", "sig-pending", {
                approvals: [{ signature: "0xsigned", signer: EVM_EXTERNAL_SIGNER_LOCATOR }],
            });
            expect(result.signature).toBe("0xfinalsig");
            expect(result.signatureId).toBe("sig-pending");
        });
    });

    describe("api-key signer short-circuit", () => {
        // pins wallet.ts approveTransactionInternal api-key early return: returns the fetched transaction without signing or submitting, even with pending approvals
        it("api-key signer returns transaction without submitting approvals even when pending approvals exist", async () => {
            const wallet = await createMockWallet("base-sepolia", mockApiClient, "api-key");

            mockApiClient.getTransaction
                .mockResolvedValueOnce(
                    evmPendingTx("txn-apikey", [{ message: "0xmsg", signer: { locator: "api-key" } }]) as any
                )
                .mockResolvedValue(successTx("txn-apikey") as any);

            const approvePromise = wallet.approve({ transactionId: "txn-apikey" });
            await vi.runAllTimersAsync();
            const result = await approvePromise;

            expect(mockApiClient.approveTransaction).not.toHaveBeenCalled();
            expect(result.hash).toBe("0xabcdef");
            expect(result.transactionId).toBe("txn-apikey");
        });

        // pins wallet.ts approveSignatureInternal api-key early return: returns the fetched signature without submitting, even with pending approvals
        it("api-key signer returns signature without submitting approvals even when pending approvals exist", async () => {
            const wallet = await createMockWallet("base-sepolia", mockApiClient, "api-key");

            mockApiClient.getSignature.mockResolvedValue({
                id: "sig-apikey",
                status: "success",
                outputSignature: "0xautosigned",
                approvals: {
                    pending: [{ message: "0xmsg", signer: { locator: "api-key" } }],
                    submitted: [],
                },
            } as any);

            const result = await wallet.approve({ signatureId: "sig-apikey" });

            expect(mockApiClient.approveSignature).not.toHaveBeenCalled();
            expect(result.signature).toBe("0xautosigned");
            expect(result.signatureId).toBe("sig-apikey");
        });

        // pins wallet.ts approveTransactionInternal branch ordering: the api-key early return precedes the options.approval check
        it("api-key signer ignores options.approval and still skips approval submission", async () => {
            const wallet = await createMockWallet("base-sepolia", mockApiClient, "api-key");

            mockApiClient.getTransaction
                .mockResolvedValueOnce(
                    evmPendingTx("txn-apikey-opt", [{ message: "0xmsg", signer: { locator: "api-key" } }]) as any
                )
                .mockResolvedValue(successTx("txn-apikey-opt") as any);

            const approvePromise = wallet.approve({
                transactionId: "txn-apikey-opt",
                options: { approval: { signature: "0xexternal", signer: "external-wallet:0x999" } as any },
            });
            await vi.runAllTimersAsync();
            const result = await approvePromise;

            expect(mockApiClient.approveTransaction).not.toHaveBeenCalled();
            expect(result.transactionId).toBe("txn-apikey-opt");
        });
    });

    describe("external options.approval path", () => {
        // pins wallet.ts approveTransactionInternal: options.approval is submitted as the sole approval, skipping pending-approval matching and signer signing
        it("submits the externally provided options.approval as the sole transaction approval without invoking the signer", async () => {
            const wallet = await createMockWallet("base-sepolia", mockApiClient, "external-wallet");
            // biome-ignore lint/style/noNonNullAssertion: signer is set by createMockWallet
            const signSpy = vi.spyOn(wallet.signer!, "signTransaction");
            const externalApproval = { signature: "0xexternal", signer: "external-wallet:0x999" };

            mockApiClient.getTransaction
                .mockResolvedValueOnce(
                    // Pending approvals exist but must be ignored — options.approval takes precedence
                    evmPendingTx("txn-ext", [
                        { message: "0xmsg", signer: { locator: EVM_EXTERNAL_SIGNER_LOCATOR } },
                    ]) as any
                )
                .mockResolvedValue(successTx("txn-ext") as any);
            mockApiClient.approveTransaction.mockResolvedValue({ id: "txn-ext", status: "pending" } as any);

            const approvePromise = wallet.approve({
                transactionId: "txn-ext",
                options: { approval: externalApproval as any },
            });
            await vi.runAllTimersAsync();
            await approvePromise;

            expect(signSpy).not.toHaveBeenCalled();
            expect(mockApiClient.approveTransaction).toHaveBeenCalledWith("me:evm:smart", "txn-ext", {
                approvals: [externalApproval],
            });
        });

        // pins wallet.ts approveSignatureInternal: options.approval is submitted as the sole approval, skipping pending-approval matching and signer signing
        it("submits the externally provided options.approval as the sole signature approval without invoking the signer", async () => {
            const wallet = await createMockWallet("base-sepolia", mockApiClient, "external-wallet");
            // biome-ignore lint/style/noNonNullAssertion: signer is set by createMockWallet
            const signMessageSpy = vi.spyOn(wallet.signer!, "signMessage");
            const externalApproval = { signature: "0xexternal", signer: "external-wallet:0x999" };

            mockApiClient.getSignature.mockResolvedValue({
                id: "sig-ext",
                status: "awaiting-approval",
                approvals: {
                    pending: [{ message: "0xmsg", signer: { locator: EVM_EXTERNAL_SIGNER_LOCATOR } }],
                    submitted: [],
                },
            } as any);
            mockApiClient.approveSignature.mockResolvedValue({
                id: "sig-ext",
                status: "success",
                outputSignature: "0xfinalsig",
            } as any);

            const result = await wallet.approve({
                signatureId: "sig-ext",
                options: { approval: externalApproval as any },
            });

            expect(signMessageSpy).not.toHaveBeenCalled();
            expect(mockApiClient.approveSignature).toHaveBeenCalledWith("me:evm:smart", "sig-ext", {
                approvals: [externalApproval],
            });
            expect(result.signature).toBe("0xfinalsig");
        });
    });

    describe("onTransactionStart callback", () => {
        async function createWalletWithCallbacks(
            onTransactionStart: () => Promise<void>,
            signerType: "api-key" | "external-wallet",
            onSign?: (message: string) => Promise<string>
        ): Promise<Wallet<"base-sepolia">> {
            const wallet = new Wallet(
                {
                    chain: "base-sepolia" as const,
                    address: "0x1234567890123456789012345678901234567890",
                    recovery: { type: "api-key" } as SignerConfigForChain<"base-sepolia">,
                    options: { callbacks: { onTransactionStart } },
                },
                mockApiClient as unknown as ApiClient
            );
            if (signerType === "api-key") {
                vi.spyOn(wallet, "signers").mockResolvedValue([
                    { type: "api-key", locator: "api-key", status: "success" } as any,
                ]);
                await wallet.useSigner({ type: "api-key" } as SignerConfigForChain<"base-sepolia">);
            } else {
                vi.spyOn(wallet, "signers").mockResolvedValue([
                    {
                        type: "external-wallet",
                        address: "0x123",
                        locator: EVM_EXTERNAL_SIGNER_LOCATOR,
                        status: "success",
                    } as any,
                ]);
                await wallet.useSigner({
                    type: "external-wallet",
                    address: "0x123",
                    onSign,
                } as unknown as SignerConfigForChain<"base-sepolia">);
            }
            return wallet;
        }

        // pins wallet.ts approveTransactionInternal: onTransactionStart is awaited after getTransaction succeeds and before signing
        it("invokes callbacks.onTransactionStart after fetching the transaction and before signing", async () => {
            const callOrder: string[] = [];
            const onTransactionStart = vi.fn(async () => {
                callOrder.push("onTransactionStart");
            });
            const onSign = vi.fn(async (_message: string) => {
                callOrder.push("sign");
                return "0xsigned";
            });
            const wallet = await createWalletWithCallbacks(onTransactionStart, "external-wallet", onSign);

            let fetchCount = 0;
            mockApiClient.getTransaction.mockImplementation(async () => {
                fetchCount++;
                if (fetchCount === 1) {
                    callOrder.push("getTransaction");
                    return evmPendingTx("txn-cb", [
                        { message: "0xcbmsg", signer: { locator: EVM_EXTERNAL_SIGNER_LOCATOR } },
                    ]) as any;
                }
                return successTx("txn-cb") as any;
            });
            mockApiClient.approveTransaction.mockResolvedValue({ id: "txn-cb", status: "pending" } as any);

            const approvePromise = wallet.approve({ transactionId: "txn-cb" });
            await vi.runAllTimersAsync();
            await approvePromise;

            expect(onTransactionStart).toHaveBeenCalledTimes(1);
            expect(callOrder).toEqual(["getTransaction", "onTransactionStart", "sign"]);
        });

        // pins wallet.ts approveTransactionInternal: TransactionNotAvailableError is thrown before onTransactionStart fires
        it("does not invoke onTransactionStart when getTransaction returns an error", async () => {
            const onTransactionStart = vi.fn(async () => {});
            const wallet = await createWalletWithCallbacks(onTransactionStart, "api-key");

            mockApiClient.getTransaction.mockResolvedValue({ error: { message: "Transaction not found" } } as any);

            const error = await captureRejection(wallet.approve({ transactionId: "txn-missing" }));

            expect(error).toBeInstanceOf(TransactionNotAvailableError);
            expect(onTransactionStart).not.toHaveBeenCalled();
        });

        // pins wallet.ts approveTransactionInternal: onTransactionStart fires for api-key signers too (before the api-key early return)
        it("invokes onTransactionStart for api-key signers", async () => {
            const onTransactionStart = vi.fn(async () => {});
            const wallet = await createWalletWithCallbacks(onTransactionStart, "api-key");

            mockApiClient.getTransaction.mockResolvedValue(successTx("txn-cb-apikey") as any);

            const approvePromise = wallet.approve({ transactionId: "txn-cb-apikey" });
            await vi.runAllTimersAsync();
            await approvePromise;

            expect(onTransactionStart).toHaveBeenCalledTimes(1);
        });
    });

    describe("approve() dispatch and shims", () => {
        // pins wallet.ts approveTransaction: deprecated shim warns with the exact message and delegates to approve()
        it("approveTransaction warns about deprecation and delegates to approve", async () => {
            const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
            try {
                const wallet = await createMockWallet("base-sepolia", mockApiClient, "api-key");
                mockApiClient.getTransaction.mockResolvedValue(successTx("txn-deprecated") as any);

                const approvePromise = wallet.approveTransaction({ transactionId: "txn-deprecated" });
                await vi.runAllTimersAsync();
                const result = await approvePromise;

                expect(warnSpy).toHaveBeenCalledWith(
                    "approveTransaction is deprecated. Use approve instead. This method will be removed in the next major version."
                );
                expect((result as any).hash).toBe("0xabcdef");
                expect((result as any).transactionId).toBe("txn-deprecated");
            } finally {
                warnSpy.mockRestore();
            }
        });

        // pins wallet.ts approve: preAuthIfNeeded is awaited before the transaction is fetched
        it("approve() calls preAuthIfNeeded before fetching the transaction", async () => {
            const wallet = await createMockWallet("base-sepolia", mockApiClient, "api-key");
            const preAuthSpy = vi.spyOn(wallet as any, "preAuthIfNeeded");
            mockApiClient.getTransaction.mockResolvedValue(successTx("txn-preauth") as any);

            const approvePromise = wallet.approve({ transactionId: "txn-preauth" });
            await vi.runAllTimersAsync();
            await approvePromise;

            expect(preAuthSpy).toHaveBeenCalledTimes(1);
            expect(preAuthSpy.mock.invocationCallOrder[0]).toBeLessThan(
                mockApiClient.getTransaction.mock.invocationCallOrder[0]
            );
        });

        // pins wallet.ts approve: params.transactionId is checked first, so signatureId is silently ignored when both are provided
        it("approve() prefers transactionId when both transactionId and signatureId are provided", async () => {
            const wallet = await createMockWallet("base-sepolia", mockApiClient, "api-key");
            mockApiClient.getTransaction.mockResolvedValue(successTx("txn-both") as any);

            const approvePromise = wallet.approve({ transactionId: "txn-both", signatureId: "sig-both" } as any);
            await vi.runAllTimersAsync();
            const result = await approvePromise;

            expect((result as any).transactionId).toBe("txn-both");
            expect((result as any).hash).toBe("0xabcdef");
            expect(mockApiClient.getSignature).not.toHaveBeenCalled();
            expect(mockApiClient.approveSignature).not.toHaveBeenCalled();
        });
    });
});
