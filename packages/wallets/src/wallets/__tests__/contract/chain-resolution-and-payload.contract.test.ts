/**
 * CHARACTERIZATION (contract) tests for:
 *
 *  1. The staging mainnet->testnet chain remap (wallet.ts resolveChainForEnvironment)
 *     as observed through send() and balances() — including the token locator built
 *     from the RESOLVED chain and the wallet.chain state mutation.
 *  2. The approval signing payload selection in wallet.ts approveTransactionInternal:
 *     the branch keys off the API RESPONSE shape (transaction.chainType === "solana"
 *     && "transaction" in transaction.onChain && signer is not device), NOT off
 *     wallet.chain — pinned with cross-chain wallet/response combinations.
 *
 * These tests pin CURRENT behavior (exact API call arguments, exact strings passed
 * to signTransaction, exact error classes/messages) ahead of the wallet.ts service
 * decomposition. If one of these fails after a refactor, observable behavior
 * drifted; do not "fix" the test without acknowledging the contract change.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { SendResponse } from "../../../api";
import { InvalidTransferAmountError } from "../../../utils/errors";
import { walletsLogger } from "../../../logger";
import { createMockApiClient, createMockWallet, type MockedApiClient } from "../test-helpers";

// The global test setup (__tests__/setup.ts) mocks walletsLogger without a `debug` method,
// but validateChainForEnvironment's mainnet->testnet auto-conversion path calls
// walletsLogger.debug. Patch the mock object only — no production code is touched.
(walletsLogger as unknown as { debug?: () => void }).debug ??= vi.fn();

const VALID_EVM_RECIPIENT = "0x1111111111111111111111111111111111111111";

/** Locators assembled by createMockWallet(..., "external-wallet") per chain. */
const STELLAR_EXTERNAL_SIGNER_LOCATOR = "external-wallet:GABC123";
const EVM_EXTERNAL_SIGNER_LOCATOR = "external-wallet:0x123";

describe("contract: chain-resolution-and-payload", () => {
    let mockApiClient: MockedApiClient;

    beforeEach(() => {
        vi.clearAllMocks();
        vi.useFakeTimers();
        // createMockApiClient defaults to environment: STAGING — the remap under test
        // only happens in non-production environments.
        mockApiClient = createMockApiClient();
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    describe("staging mainnet->testnet remap through send() (resolveChainForEnvironment)", () => {
        // pins wallet.ts send(): tokenLocator is built from the RESOLVED chain ("polygon-amoy:usdc",
        // not "polygon:usdc") and resolveChainForEnvironment mutates wallet.chain to the testnet equivalent
        it("send() on a 'polygon' wallet in staging sends a 'polygon-amoy:usdc' token locator and mutates wallet.chain", async () => {
            const wallet = await createMockWallet("polygon", mockApiClient, "api-key");
            expect(wallet.chain).toBe("polygon");

            mockApiClient.send.mockResolvedValue({ id: "txn-remap-1" } as unknown as SendResponse);
            mockApiClient.getTransaction.mockResolvedValue({
                id: "txn-remap-1",
                status: "success",
                onChain: { txId: "0xremaphash", explorerLink: "https://explorer.test/tx/0xremaphash" },
            } as any);

            const sendPromise = wallet.send(VALID_EVM_RECIPIENT, "usdc", "1.0");
            await vi.runAllTimersAsync();
            const result = await sendPromise;

            expect(mockApiClient.send).toHaveBeenCalledTimes(1);
            expect(mockApiClient.send).toHaveBeenCalledWith("me:evm:smart", "polygon-amoy:usdc", {
                recipient: VALID_EVM_RECIPIENT,
                amount: "1.0",
                signer: "api-key",
            });
            // state effect: resolveChainForEnvironment writes the resolved chain back onto the wallet
            expect(wallet.chain).toBe("polygon-amoy");
            expect(result.hash).toBe("0xremaphash");
            expect(result.transactionId).toBe("txn-remap-1");
        });

        // pins wallet.ts send() statement ordering: resolveChainForEnvironment runs (and mutates
        // wallet.chain) BEFORE amount validation, so the mutation persists even when send() throws
        // NOTE: suspected bug — a send() call that fails validation still permanently rewrites
        // wallet.chain ("polygon" -> "polygon-amoy"); state mutation on a failed call
        it("send() mutates wallet.chain to 'polygon-amoy' even when the amount is invalid and no API call is made", async () => {
            const wallet = await createMockWallet("polygon", mockApiClient, "api-key");
            expect(wallet.chain).toBe("polygon");

            const error = await wallet.send(VALID_EVM_RECIPIENT, "usdc", "-5").then(
                () => {
                    throw new Error("expected send to reject, but it resolved");
                },
                (e: unknown) => e
            );

            expect(error).toBeInstanceOf(InvalidTransferAmountError);
            expect((error as Error).message).toBe(
                'Invalid transfer amount: "-5". Amount must be a positive number greater than zero.'
            );
            expect(mockApiClient.send).not.toHaveBeenCalled();
            // the chain remap side effect already happened before validation threw
            expect(wallet.chain).toBe("polygon-amoy");
        });
    });

    describe("staging mainnet->testnet remap through balances() (resolveChainForEnvironment)", () => {
        // pins wallet.ts balances(): getBalance receives chains:[<resolved chain>] ("polygon-amoy"),
        // native token symbol is selected AFTER resolution (switch on this.chain default arm -> "eth"),
        // and wallet.chain is mutated to "polygon-amoy"
        it("balances() on a 'polygon' wallet in staging requests chains:['polygon-amoy'] with tokens ['eth','usdc'] and mutates wallet.chain", async () => {
            const wallet = await createMockWallet("polygon", mockApiClient, "api-key");
            expect(wallet.chain).toBe("polygon");

            mockApiClient.getBalance.mockResolvedValue([] as any);

            const balances = await wallet.balances();

            expect(mockApiClient.getBalance).toHaveBeenCalledTimes(1);
            expect(mockApiClient.getBalance).toHaveBeenCalledWith("0x1234567890123456789012345678901234567890", {
                chains: ["polygon-amoy"],
                tokens: ["eth", "usdc"],
            });
            // state effect: resolveChainForEnvironment writes the resolved chain back onto the wallet
            expect(wallet.chain).toBe("polygon-amoy");
            // native token symbol selection happened after resolution and stayed "eth" (EVM default arm);
            // empty API response yields the default zero-balance token with contractAddress: undefined
            expect(balances.nativeToken).toEqual({
                symbol: "eth",
                name: "eth",
                amount: "0",
                decimals: 0,
                rawAmount: "0",
                contractAddress: undefined,
            });
        });

        // pins wallet.ts balances(): extra requested tokens are appended after the always-included
        // [nativeToken, "usdc"] pair, still under the resolved chain
        it("balances(['dai']) on a 'polygon' wallet in staging appends extra tokens after ['eth','usdc']", async () => {
            const wallet = await createMockWallet("polygon", mockApiClient, "api-key");
            mockApiClient.getBalance.mockResolvedValue([] as any);

            await wallet.balances(["dai"]);

            expect(mockApiClient.getBalance).toHaveBeenCalledWith("0x1234567890123456789012345678901234567890", {
                chains: ["polygon-amoy"],
                tokens: ["eth", "usdc", "dai"],
            });
        });
    });

    describe("approval signing payload keyed off the API response shape (approveTransactionInternal)", () => {
        // pins wallet.ts approveTransactionInternal payload branch: a STELLAR wallet approving a
        // transaction whose RESPONSE carries chainType:"solana" + onChain.transaction signs the
        // serialized onChain.transaction, NOT pendingApproval.message (branch keys off the response
        // shape, not wallet.chain — this is the real stellar flow)
        it("stellar wallet signs onChain.transaction when the transaction response has chainType 'solana' with onChain.transaction", async () => {
            const stellarWallet = await createMockWallet("stellar", mockApiClient, "external-wallet");
            // biome-ignore lint/style/noNonNullAssertion: signer is set by createMockWallet
            const signSpy = vi.spyOn(stellarWallet.signer!, "signTransaction");

            mockApiClient.getTransaction
                .mockResolvedValueOnce({
                    id: "stellar-txn",
                    status: "awaiting-approval",
                    chainType: "solana",
                    walletType: "smart",
                    onChain: { transaction: "SERIALIZED_STELLAR_AS_SOLANA_TX" },
                    approvals: {
                        pending: [
                            {
                                message: "pending-message-not-to-be-signed",
                                signer: { locator: STELLAR_EXTERNAL_SIGNER_LOCATOR },
                            },
                        ],
                        submitted: [],
                    },
                } as any)
                .mockResolvedValue({
                    id: "stellar-txn",
                    status: "success",
                    chainType: "stellar",
                    onChain: {
                        txEnvelope: "envelope-xdr",
                        txHash: "stellar-hash",
                        explorerLink: "https://stellar.explorer/stellar-txn",
                    },
                } as any);
            mockApiClient.approveTransaction.mockResolvedValue({ id: "stellar-txn", status: "pending" } as any);

            const approvePromise = stellarWallet.approve({ transactionId: "stellar-txn" });
            await vi.runAllTimersAsync();
            const result = await approvePromise;

            expect(signSpy).toHaveBeenCalledTimes(1);
            expect(signSpy).toHaveBeenCalledWith("SERIALIZED_STELLAR_AS_SOLANA_TX");
            expect(signSpy).not.toHaveBeenCalledWith("pending-message-not-to-be-signed");
            expect(mockApiClient.approveTransaction).toHaveBeenCalledWith("me:stellar:smart", "stellar-txn", {
                approvals: [{ signature: "0xsigned", signer: STELLAR_EXTERNAL_SIGNER_LOCATOR }],
            });
            // stellar terminal success resolves the hash from onChain.txHash (txId is absent)
            expect(result.hash).toBe("stellar-hash");
        });

        // pins wallet.ts approveTransactionInternal payload branch: a stellar-shaped response
        // (chainType !== "solana") falls through to signing pendingApproval.message
        it("stellar wallet signs pendingApproval.message when the transaction response chainType is 'stellar'", async () => {
            const stellarWallet = await createMockWallet("stellar", mockApiClient, "external-wallet");
            // biome-ignore lint/style/noNonNullAssertion: signer is set by createMockWallet
            const signSpy = vi.spyOn(stellarWallet.signer!, "signTransaction");

            mockApiClient.getTransaction
                .mockResolvedValueOnce({
                    id: "stellar-txn-2",
                    status: "awaiting-approval",
                    chainType: "stellar",
                    walletType: "smart",
                    onChain: { txEnvelope: "envelope-to-sign" },
                    approvals: {
                        pending: [
                            {
                                message: "stellar-pending-message",
                                signer: { locator: STELLAR_EXTERNAL_SIGNER_LOCATOR },
                            },
                        ],
                        submitted: [],
                    },
                } as any)
                .mockResolvedValue({
                    id: "stellar-txn-2",
                    status: "success",
                    chainType: "stellar",
                    onChain: {
                        txEnvelope: "envelope-xdr",
                        txHash: "stellar-hash-2",
                        explorerLink: "https://stellar.explorer/stellar-txn-2",
                    },
                } as any);
            mockApiClient.approveTransaction.mockResolvedValue({ id: "stellar-txn-2", status: "pending" } as any);

            const approvePromise = stellarWallet.approve({ transactionId: "stellar-txn-2" });
            await vi.runAllTimersAsync();
            await approvePromise;

            expect(signSpy).toHaveBeenCalledTimes(1);
            expect(signSpy).toHaveBeenCalledWith("stellar-pending-message");
            expect(mockApiClient.approveTransaction).toHaveBeenCalledWith("me:stellar:smart", "stellar-txn-2", {
                approvals: [{ signature: "0xsigned", signer: STELLAR_EXTERNAL_SIGNER_LOCATOR }],
            });
        });

        // pins wallet.ts approveTransactionInternal payload branch: even an EVM wallet signs
        // onChain.transaction when the RESPONSE claims chainType "solana" + onChain.transaction —
        // proof the branch is keyed off the response shape, never off wallet.chain
        it("evm wallet signs onChain.transaction when the transaction response claims chainType 'solana' with onChain.transaction", async () => {
            const evmWallet = await createMockWallet("base-sepolia", mockApiClient, "external-wallet");
            // biome-ignore lint/style/noNonNullAssertion: signer is set by createMockWallet
            const signSpy = vi.spyOn(evmWallet.signer!, "signTransaction");

            mockApiClient.getTransaction
                .mockResolvedValueOnce({
                    id: "evm-txn",
                    status: "awaiting-approval",
                    chainType: "solana",
                    walletType: "smart",
                    onChain: { transaction: "SOLANA_SHAPED_TX_ON_EVM_WALLET" },
                    approvals: {
                        pending: [
                            { message: "0xevm-pending-message", signer: { locator: EVM_EXTERNAL_SIGNER_LOCATOR } },
                        ],
                        submitted: [],
                    },
                } as any)
                .mockResolvedValue({
                    id: "evm-txn",
                    status: "success",
                    onChain: { txId: "0xevmhash", explorerLink: "https://explorer.test/tx/0xevmhash" },
                } as any);
            mockApiClient.approveTransaction.mockResolvedValue({ id: "evm-txn", status: "pending" } as any);

            const approvePromise = evmWallet.approve({ transactionId: "evm-txn" });
            await vi.runAllTimersAsync();
            await approvePromise;

            expect(signSpy).toHaveBeenCalledTimes(1);
            expect(signSpy).toHaveBeenCalledWith("SOLANA_SHAPED_TX_ON_EVM_WALLET");
            expect(signSpy).not.toHaveBeenCalledWith("0xevm-pending-message");
            expect(mockApiClient.approveTransaction).toHaveBeenCalledWith("me:evm:smart", "evm-txn", {
                approvals: [{ signature: "0xsigned", signer: EVM_EXTERNAL_SIGNER_LOCATOR }],
            });
        });

        // pins wallet.ts approveTransactionInternal payload branch conjunct '"transaction" in transaction.onChain':
        // a chainType "solana" response WITHOUT onChain.transaction falls back to pendingApproval.message
        // (observed through a fake additionalSigner so the real solana adapter's base58 handling stays out of scope)
        it("solana wallet signs pendingApproval.message when a chainType 'solana' response lacks onChain.transaction", async () => {
            const solanaWallet = await createMockWallet("solana", mockApiClient, "external-wallet");
            const fakeSigner = {
                type: "external-wallet",
                locator: () => "external-wallet:FakeSolanaSignerLocator",
                signMessage: vi.fn().mockResolvedValue({ signature: "fake-sig" }),
                signTransaction: vi.fn().mockResolvedValue({ signature: "fake-sig" }),
            };

            mockApiClient.getTransaction
                .mockResolvedValueOnce({
                    id: "sol-txn-no-onchain-tx",
                    status: "awaiting-approval",
                    chainType: "solana",
                    walletType: "smart",
                    onChain: {},
                    approvals: {
                        pending: [
                            {
                                message: "sol-message-fallback",
                                signer: { locator: "external-wallet:FakeSolanaSignerLocator" },
                            },
                        ],
                        submitted: [],
                    },
                } as any)
                .mockResolvedValue({
                    id: "sol-txn-no-onchain-tx",
                    status: "success",
                    onChain: { txId: "sol-tx-hash", explorerLink: "https://explorer.solana.com/tx/sol-tx-hash" },
                } as any);
            mockApiClient.approveTransaction.mockResolvedValue({
                id: "sol-txn-no-onchain-tx",
                status: "pending",
            } as any);

            const approvePromise = solanaWallet.approve({
                transactionId: "sol-txn-no-onchain-tx",
                options: { additionalSigners: [fakeSigner as any] },
            });
            await vi.runAllTimersAsync();
            await approvePromise;

            expect(fakeSigner.signTransaction).toHaveBeenCalledTimes(1);
            expect(fakeSigner.signTransaction).toHaveBeenCalledWith("sol-message-fallback");
            expect(mockApiClient.approveTransaction).toHaveBeenCalledWith("me:solana:smart", "sol-txn-no-onchain-tx", {
                approvals: [{ signature: "fake-sig", signer: "external-wallet:FakeSolanaSignerLocator" }],
            });
        });
    });
});
