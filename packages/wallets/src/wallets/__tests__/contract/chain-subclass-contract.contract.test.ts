/**
 * Characterization (contract) tests for the chain subclass <-> base Wallet handoff.
 *
 * These tests pin CURRENT behavior of EVMWallet / SolanaWallet / StellarWallet and the
 * protected-state rewrap performed by their constructors (via Wallet.getOptions /
 * getRecovery / getInitialSigners / getApiRecoveryServerSignerAddress /
 * getApiDelegatedServerSignerAddresses / getApiClient) before wallet.ts is decomposed
 * into services. Exact error classes, exact message strings, exact API call arguments,
 * and locator formats are all part of the contract — do not "fix" them here.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import bs58 from "bs58";
import { Keypair, TransactionMessage, VersionedTransaction } from "@solana/web3.js";
import { Wallet } from "../../wallet";
import { EVMWallet } from "../../evm";
import { SolanaWallet } from "../../solana";
import { StellarWallet } from "../../stellar";
import { TransactionConfirmationTimeoutError } from "../../../utils/errors";
import { deriveServerSignerCandidates } from "../../../signers/server";
import type { ApiClient } from "../../../api";
import type { Chain } from "../../../chains/chains";
import {
    createMockApiClient,
    createMockWallet,
    createMockSolanaSerializedTransaction,
    type MockedApiClient,
} from "../test-helpers";

const EVM_ADDRESS = "0x1234567890123456789012345678901234567890";
const SOLANA_ADDRESS = "9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM";
const STELLAR_ADDRESS = "GCKFBEIYTKP6RCZX6LRQW2JVAVLMGGVSNESWKN7L2YGQNI2DCOHVHJVY";
const STELLAR_CONTRACT_ID = "CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC";

/**
 * Construct a base Wallet directly (mirroring test-helpers.createMockWallet) but with
 * extra constructor fields (alias, owner, options, signers, recovery overrides, ...)
 * that the shared helper does not expose. By default activates the api-key signer,
 * which matches the api-key recovery (admin path) and therefore performs no API calls.
 */
async function createConfiguredWallet<C extends Chain>(
    chain: C,
    address: string,
    mockApiClient: MockedApiClient,
    constructorOverrides: Record<string, unknown> = {},
    { useApiKeySigner = true }: { useApiKeySigner?: boolean } = {}
): Promise<Wallet<C>> {
    const wallet = new Wallet<C>(
        {
            chain,
            address,
            recovery: { type: "api-key" },
            ...constructorOverrides,
            // biome-ignore lint/suspicious/noExplicitAny: test constructs raw wallet state
        } as any,
        mockApiClient as unknown as ApiClient
    );
    if (useApiKeySigner) {
        // biome-ignore lint/suspicious/noExplicitAny: api-key config is valid on every chain
        await wallet.useSigner({ type: "api-key" } as any);
    }
    return wallet;
}

function pendingTransactionResponse(id: string, chainType: string) {
    return {
        id,
        status: "pending",
        chainType,
        walletType: "smart" as const,
        createdAt: Date.now(),
        // biome-ignore lint/suspicious/noExplicitAny: partial API response shape
    } as any;
}

function successTransactionResponse(id: string, chainType: string, txId: string) {
    return {
        id,
        status: "success",
        chainType,
        walletType: "smart" as const,
        onChain: { txId, explorerLink: `https://explorer.example.com/tx/${txId}` },
        createdAt: Date.now(),
        // biome-ignore lint/suspicious/noExplicitAny: partial API response shape
    } as any;
}

describe("contract: chain-subclass-contract", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    describe("SolanaWallet additionalSigners wrapping", () => {
        // pins solana.ts sendTransaction additionalSigners wrap -> wallet.ts approveTransactionInternal signer matching + apiClient.approveTransaction submission
        it("sendTransaction wraps additionalSigners as external-wallet signers and submits their approvals to approveTransaction", async () => {
            vi.useFakeTimers();
            const mockApiClient = createMockApiClient();
            const wallet = await createMockWallet("solana", mockApiClient, "external-wallet");
            const solanaWallet = SolanaWallet.from(wallet);

            // Build a real v0 transaction whose only required signer is the additional signer.
            const additionalSigner = Keypair.generate();
            const message = new TransactionMessage({
                payerKey: additionalSigner.publicKey,
                recentBlockhash: bs58.encode(new Uint8Array(32).fill(7)),
                instructions: [],
            }).compileToV0Message();
            const serializedTx = bs58.encode(new VersionedTransaction(message).serialize());

            // The exact signature the wrapped signer's onSign (transaction.sign([signer]))
            // must produce — ed25519 is deterministic.
            const expectedTx = VersionedTransaction.deserialize(bs58.decode(serializedTx));
            expectedTx.sign([additionalSigner]);
            const expectedSignature = bs58.encode(expectedTx.signatures[0]);

            const additionalSignerLocator = `external-wallet:${additionalSigner.publicKey.toString()}`;

            mockApiClient.createTransaction.mockResolvedValue(
                pendingTransactionResponse("txn-additional-signers", "solana")
            );
            // 1st getTransaction: approveTransactionInternal sees the pending approval for
            // the additional signer's locator. Subsequent calls: waitForTransaction success.
            mockApiClient.getTransaction
                .mockResolvedValueOnce({
                    id: "txn-additional-signers",
                    status: "awaiting-approval",
                    chainType: "solana",
                    walletType: "smart" as const,
                    onChain: { transaction: serializedTx },
                    approvals: {
                        pending: [{ signer: { locator: additionalSignerLocator }, message: "ignored-for-non-device" }],
                    },
                    // biome-ignore lint/suspicious/noExplicitAny: partial API response shape
                } as any)
                .mockResolvedValue(successTransactionResponse("txn-additional-signers", "solana", "solanaTxHash123"));
            // biome-ignore lint/suspicious/noExplicitAny: partial API response shape
            mockApiClient.approveTransaction.mockResolvedValue({
                id: "txn-additional-signers",
                status: "pending",
            } as any);

            const sendPromise = solanaWallet.sendTransaction({
                serializedTransaction: serializedTx,
                additionalSigners: [additionalSigner],
            });
            await vi.runAllTimersAsync();
            const result = await sendPromise;

            expect(result.hash).toBe("solanaTxHash123");
            expect(result.transactionId).toBe("txn-additional-signers");
            expect(mockApiClient.approveTransaction).toHaveBeenCalledTimes(1);
            // The approval is signed by the wrapped additional signer (onSign -> transaction.sign([signer]))
            // and submitted under the `external-wallet:<pubkey>` locator.
            expect(mockApiClient.approveTransaction).toHaveBeenCalledWith("me:solana:smart", "txn-additional-signers", {
                approvals: [{ signature: expectedSignature, signer: additionalSignerLocator }],
            });
        });
    });

    describe("from() rewrap state carryover", () => {
        // pins wallet.ts approveTransactionInternal: await this.#options?.callbacks?.onTransactionStart?.() with options carried via Wallet.getOptions
        it("from() preserves wallet options so onTransactionStart callback fires during rewrapped sendTransaction", async () => {
            vi.useFakeTimers();
            const mockApiClient = createMockApiClient();
            const onTransactionStart = vi.fn().mockResolvedValue(undefined);
            const wallet = await createConfiguredWallet("base-sepolia", EVM_ADDRESS, mockApiClient, {
                options: { callbacks: { onTransactionStart } },
            });
            const evmWallet = EVMWallet.from(wallet);

            mockApiClient.createTransaction.mockResolvedValue(pendingTransactionResponse("txn-callbacks", "evm"));
            mockApiClient.getTransaction.mockResolvedValue(
                successTransactionResponse("txn-callbacks", "evm", "0xcallbackhash")
            );

            const sendPromise = evmWallet.sendTransaction({ transaction: "0xdeadbeef" });
            await vi.runAllTimersAsync();
            const result = await sendPromise;

            expect(result.hash).toBe("0xcallbackhash");
            expect(onTransactionStart).toHaveBeenCalledTimes(1);
        });

        // pins wallet.ts walletLocator getter: me:<chain>:smart + ":alias:<alias>" suffix, alias carried through subclass constructors
        it("from() preserves alias so rewrapped wallet API calls use me:<chain>:smart:alias:<alias> locator", async () => {
            // EVM
            const evmApi = createMockApiClient();
            const evmBase = await createConfiguredWallet("base-sepolia", EVM_ADDRESS, evmApi, { alias: "my-alias" });
            const evmWallet = EVMWallet.from(evmBase);
            evmApi.createTransaction.mockResolvedValue(pendingTransactionResponse("txn-alias-evm", "evm"));
            await evmWallet.sendTransaction({ transaction: "0xdeadbeef", options: { prepareOnly: true } });
            expect(evmApi.createTransaction).toHaveBeenCalledWith("me:evm:smart:alias:my-alias", expect.anything());

            // Solana
            const solApi = createMockApiClient();
            const solBase = await createConfiguredWallet("solana", SOLANA_ADDRESS, solApi, { alias: "my-alias" });
            const solWallet = SolanaWallet.from(solBase);
            solApi.createTransaction.mockResolvedValue(pendingTransactionResponse("txn-alias-sol", "solana"));
            await solWallet.sendTransaction({
                serializedTransaction: createMockSolanaSerializedTransaction(),
                options: { prepareOnly: true },
            });
            expect(solApi.createTransaction).toHaveBeenCalledWith("me:solana:smart:alias:my-alias", expect.anything());

            // Stellar
            const xlmApi = createMockApiClient();
            const xlmBase = await createConfiguredWallet("stellar", STELLAR_ADDRESS, xlmApi, { alias: "my-alias" });
            const xlmWallet = StellarWallet.from(xlmBase);
            xlmApi.createTransaction.mockResolvedValue(pendingTransactionResponse("txn-alias-xlm", "stellar"));
            await xlmWallet.sendTransaction({
                transaction: "AAAA-serialized-xdr",
                contractId: STELLAR_CONTRACT_ID,
                options: { prepareOnly: true },
            });
            expect(xlmApi.createTransaction).toHaveBeenCalledWith("me:stellar:smart:alias:my-alias", expect.anything());
        });

        // pins evm.ts/solana.ts/stellar.ts constructors `signer: wallet.signer` -> createTransaction signer: requireSigner().locator()
        it("from() carries over the active signer so sendTransaction works without re-calling useSigner", async () => {
            // EVM — no useSigner call after from()
            const evmApi = createMockApiClient();
            const evmWallet = EVMWallet.from(await createMockWallet("base-sepolia", evmApi, "api-key"));
            evmApi.createTransaction.mockResolvedValue(pendingTransactionResponse("txn-carry-evm", "evm"));
            const evmResult = await evmWallet.sendTransaction({
                to: "0x00000000000000000000000000000000000000aa",
                options: { prepareOnly: true },
            });
            expect(evmResult.transactionId).toBe("txn-carry-evm");
            expect(evmApi.createTransaction).toHaveBeenCalledWith("me:evm:smart", {
                params: {
                    signer: "api-key",
                    chain: "base-sepolia",
                    calls: [{ to: "0x00000000000000000000000000000000000000aa", value: "0", data: "0x" }],
                },
            });

            // Solana — no useSigner call after from()
            const solApi = createMockApiClient();
            const solWallet = SolanaWallet.from(await createMockWallet("solana", solApi, "api-key"));
            solApi.createTransaction.mockResolvedValue(pendingTransactionResponse("txn-carry-sol", "solana"));
            const serializedTx = createMockSolanaSerializedTransaction();
            const solResult = await solWallet.sendTransaction({
                serializedTransaction: serializedTx,
                options: { prepareOnly: true },
            });
            expect(solResult.transactionId).toBe("txn-carry-sol");
            expect(solApi.createTransaction).toHaveBeenCalledWith("me:solana:smart", {
                params: { transaction: serializedTx, signer: "api-key" },
            });

            // Stellar — no useSigner call after from()
            const xlmApi = createMockApiClient();
            const xlmWallet = StellarWallet.from(await createMockWallet("stellar", xlmApi, "api-key"));
            xlmApi.createTransaction.mockResolvedValue(pendingTransactionResponse("txn-carry-xlm", "stellar"));
            const xlmResult = await xlmWallet.sendTransaction({
                transaction: "AAAA-serialized-xdr",
                contractId: STELLAR_CONTRACT_ID,
                options: { prepareOnly: true },
            });
            expect(xlmResult.transactionId).toBe("txn-carry-xlm");
            expect(xlmApi.createTransaction).toHaveBeenCalledWith("me:stellar:smart", {
                params: {
                    transaction: {
                        type: "serialized-transaction",
                        serializedTransaction: "AAAA-serialized-xdr",
                        contractId: STELLAR_CONTRACT_ID,
                    },
                    signer: "api-key",
                },
            });
        });

        // pins wallet.ts requireSigner multi-signer branch fed by `signers: Wallet.getInitialSigners(wallet)` in the subclass constructors
        it("from() preserves initial signers so multi-signer requireSigner error survives rewrap", async () => {
            const mockApiClient = createMockApiClient();
            const wallet = await createConfiguredWallet(
                "base-sepolia",
                EVM_ADDRESS,
                mockApiClient,
                {
                    signers: [
                        { type: "external-wallet", address: "0x00000000000000000000000000000000000000a1" },
                        { type: "external-wallet", address: "0x00000000000000000000000000000000000000a2" },
                    ],
                },
                { useApiKeySigner: false }
            );
            const evmWallet = EVMWallet.from(wallet);

            await expect(evmWallet.signMessage({ message: "hello" })).rejects.toThrow(
                "No signer is set. This wallet has multiple signers configured. " +
                    "Call wallet.useSigner() to select which signer to use before signing operations."
            );
            // Thrown before any API call is made
            expect(mockApiClient.createSignature).not.toHaveBeenCalled();
        });

        // pins wallet.ts requireSigner server-recovery branch fed by `recovery: Wallet.getRecovery(wallet)` in the subclass constructors
        it("from() preserves recovery config so server-wallet requireSigner guidance error survives rewrap", async () => {
            const mockApiClient = createMockApiClient();
            const wallet = await createConfiguredWallet(
                "base-sepolia",
                EVM_ADDRESS,
                mockApiClient,
                { recovery: { type: "server", address: "0x00000000000000000000000000000000000000f1" } },
                { useApiKeySigner: false }
            );
            const evmWallet = EVMWallet.from(wallet);

            await expect(evmWallet.signMessage({ message: "hello" })).rejects.toThrow(
                "No signer is set. Server wallets require calling wallet.useSigner() with the server secret before signing operations.\n" +
                    'Example: wallet.useSigner({ type: "server", secret: process.env.YOUR_SERVER_SECRET })'
            );
            expect(mockApiClient.createSignature).not.toHaveBeenCalled();
        });

        // pins wallet.ts resolveServerSignerDerivation legacy-address matching fed by apiRecoveryServerSignerAddress / apiDelegatedServerSignerAddresses rewrap handoff
        it("from() preserves API server-signer addresses so legacy server signer derivation resolves identically after rewrap", async () => {
            const SECRET = "a".repeat(64);
            const PROJECT_ID = "test-project";
            const env = createMockApiClient().environment;
            const { primary, legacy } = deriveServerSignerCandidates(
                { type: "server", secret: SECRET },
                "base-sepolia",
                PROJECT_ID,
                env
            );
            expect(legacy).not.toBeNull();
            const legacyAddress = legacy!.derivedAddress;
            const primaryAddress = primary.derivedAddress;
            expect(legacyAddress).not.toBe(primaryAddress);

            // Path 1: legacy derivation matches the API-sourced recovery server signer address.
            const apiA = createMockApiClient();
            // biome-ignore lint/suspicious/noExplicitAny: projectId lives on the real ApiClient
            (apiA as any).projectId = PROJECT_ID;
            const walletA = await createConfiguredWallet(
                "base-sepolia",
                EVM_ADDRESS,
                apiA,
                { recovery: { type: "server", address: legacyAddress } },
                { useApiKeySigner: false }
            );
            vi.spyOn(walletA, "signers").mockResolvedValue([
                // biome-ignore lint/suspicious/noExplicitAny: partial signer shape
                { type: "api-key", locator: "api-key", status: "success" } as any,
            ]);
            // biome-ignore lint/suspicious/noExplicitAny: api-key config is valid on every chain
            await walletA.useSigner({ type: "api-key" } as any);
            const evmA = EVMWallet.from(walletA);
            apiA.createTransaction.mockResolvedValue(pendingTransactionResponse("txn-server-a", "evm"));
            await evmA.sendTransaction({
                transaction: "0xdeadbeef",
                options: { prepareOnly: true, signer: { type: "server", secret: SECRET } },
            });
            expect(apiA.createTransaction).toHaveBeenCalledWith(
                "me:evm:smart",
                expect.objectContaining({
                    params: expect.objectContaining({ signer: `server:${legacyAddress}` }),
                })
            );

            // Path 2: legacy derivation matches a delegated server signer address.
            const apiB = createMockApiClient();
            // biome-ignore lint/suspicious/noExplicitAny: projectId lives on the real ApiClient
            (apiB as any).projectId = PROJECT_ID;
            const walletB = await createConfiguredWallet("base-sepolia", EVM_ADDRESS, apiB, {
                apiDelegatedServerSignerAddresses: [legacyAddress],
            });
            const evmB = EVMWallet.from(walletB);
            apiB.createTransaction.mockResolvedValue(pendingTransactionResponse("txn-server-b", "evm"));
            await evmB.sendTransaction({
                transaction: "0xdeadbeef",
                options: { prepareOnly: true, signer: { type: "server", secret: SECRET } },
            });
            expect(apiB.createTransaction).toHaveBeenCalledWith(
                "me:evm:smart",
                expect.objectContaining({
                    params: expect.objectContaining({ signer: `server:${legacyAddress}` }),
                })
            );
        });

        // pins evm.ts/solana.ts/stellar.ts constructors `owner: wallet.owner` / `address: wallet.address` property copies
        it("from() preserves address and owner on the rewrapped wallet", async () => {
            const owner = "email:owner@example.com";

            const evmApi = createMockApiClient();
            const evmWallet = EVMWallet.from(
                await createConfiguredWallet("base-sepolia", EVM_ADDRESS, evmApi, { owner })
            );
            expect(evmWallet.address).toBe(EVM_ADDRESS);
            expect(evmWallet.owner).toBe(owner);

            const solApi = createMockApiClient();
            const solWallet = SolanaWallet.from(
                await createConfiguredWallet("solana", SOLANA_ADDRESS, solApi, { owner })
            );
            expect(solWallet.address).toBe(SOLANA_ADDRESS);
            expect(solWallet.owner).toBe(owner);

            const xlmApi = createMockApiClient();
            const xlmWallet = StellarWallet.from(
                await createConfiguredWallet("stellar", STELLAR_ADDRESS, xlmApi, { owner })
            );
            expect(xlmWallet.address).toBe(STELLAR_ADDRESS);
            expect(xlmWallet.owner).toBe(owner);
        });

        // pins wallet.ts initDefaultSigner early return (`if (this.#signer != null) return`) on the from() rewrap construction path
        it("from() rewrap does not re-trigger device signer initialization when a signer is already set", async () => {
            const mockApiClient = createMockApiClient();
            const storage = {
                getKey: vi.fn().mockResolvedValue(null),
                hasKey: vi.fn().mockResolvedValue(false),
                mapAddressToKey: vi.fn(),
                deleteKey: vi.fn(),
            };

            // Donor wallet provides an already-assembled SignerAdapter (api-key admin path, no API calls).
            const donor = await createMockWallet("base-sepolia", mockApiClient, "api-key");
            const wallet = await createConfiguredWallet(
                "base-sepolia",
                EVM_ADDRESS,
                mockApiClient,
                {
                    // biome-ignore lint/suspicious/noExplicitAny: minimal DeviceSignerKeyStorage stub
                    options: { deviceSignerKeyStorage: storage as any },
                    signer: donor.signer,
                },
                { useApiKeySigner: false }
            );
            await wallet.waitForInit();
            storage.getKey.mockClear();
            storage.hasKey.mockClear();
            mockApiClient.registerSigner.mockClear();
            mockApiClient.getSigner.mockClear();

            const evmWallet = EVMWallet.from(wallet);
            await evmWallet.waitForInit();

            // Carried-over signer short-circuits initDefaultSigner: no storage access, no registration.
            expect(evmWallet.signer).toBe(wallet.signer);
            expect(storage.getKey).not.toHaveBeenCalled();
            expect(storage.hasKey).not.toHaveBeenCalled();
            expect(mockApiClient.registerSigner).not.toHaveBeenCalled();
            expect(mockApiClient.getSigner).not.toHaveBeenCalled();
        });
    });

    describe("default transaction confirmation timeout", () => {
        // pins wallet.ts approveTransactionAndWait -> waitForTransaction default timeoutMs = 60_000 and TransactionConfirmationTimeoutError message (EVM path)
        it("EVM sendTransaction rejects with TransactionConfirmationTimeoutError('Transaction confirmation timeout') after the 60s default polling window", async () => {
            vi.useFakeTimers();
            const mockApiClient = createMockApiClient();
            const evmWallet = EVMWallet.from(await createMockWallet("base-sepolia", mockApiClient, "api-key"));

            mockApiClient.createTransaction.mockResolvedValue(pendingTransactionResponse("txn-timeout-evm", "evm"));
            mockApiClient.getTransaction.mockResolvedValue(pendingTransactionResponse("txn-timeout-evm", "evm"));

            const startedAt = Date.now();
            const sendPromise = evmWallet.sendTransaction({ transaction: "0xdeadbeef" });
            const guard = sendPromise.catch(() => {});
            await vi.runAllTimersAsync();
            await expect(sendPromise).rejects.toThrow(TransactionConfirmationTimeoutError);
            await expect(sendPromise).rejects.toThrow("Transaction confirmation timeout");
            await guard;

            // 1s post-approval sleep + just over the 60_000ms default polling window
            // (backoff: 500ms * 1.1^n capped at 2_000ms, so overshoot is at most one 2s sleep).
            const elapsed = Date.now() - startedAt;
            expect(elapsed).toBeGreaterThan(61_000);
            expect(elapsed).toBeLessThanOrEqual(63_500);
        });

        // pins that stellar.ts passes NO custom timeout — approveTransactionAndWait uses the same shared 60s default (contrary to the audit brief)
        it("Stellar sendTransaction times out with the same shared 60s default", async () => {
            vi.useFakeTimers();
            const mockApiClient = createMockApiClient();
            const stellarWallet = StellarWallet.from(await createMockWallet("stellar", mockApiClient, "api-key"));

            mockApiClient.createTransaction.mockResolvedValue(pendingTransactionResponse("txn-timeout-xlm", "stellar"));
            mockApiClient.getTransaction.mockResolvedValue(pendingTransactionResponse("txn-timeout-xlm", "stellar"));

            const startedAt = Date.now();
            const sendPromise = stellarWallet.sendTransaction({
                transaction: "AAAA-serialized-xdr",
                contractId: STELLAR_CONTRACT_ID,
            });
            const guard = sendPromise.catch(() => {});
            await vi.runAllTimersAsync();
            await expect(sendPromise).rejects.toThrow(TransactionConfirmationTimeoutError);
            await expect(sendPromise).rejects.toThrow("Transaction confirmation timeout");
            await guard;

            const elapsed = Date.now() - startedAt;
            expect(elapsed).toBeGreaterThan(61_000);
            expect(elapsed).toBeLessThanOrEqual(63_500);
        });
    });

    describe("EVM signer param resolution", () => {
        let mockApiClient: MockedApiClient;
        let evmWallet: EVMWallet;

        beforeEach(async () => {
            mockApiClient = createMockApiClient();
            evmWallet = EVMWallet.from(await createMockWallet("base-sepolia", mockApiClient, "api-key"));
        });

        // pins evm.ts signMessage/signTypedData params.signer = requireSigner().locator() (createSignature payload)
        it("signMessage and signTypedData pass requireSigner().locator() as the signer param to createSignature", async () => {
            // biome-ignore lint/suspicious/noExplicitAny: partial API response shape
            mockApiClient.createSignature.mockResolvedValue({ id: "sig-message", status: "pending" } as any);
            await evmWallet.signMessage({ message: "Hello, contract!", options: { prepareOnly: true } });
            expect(mockApiClient.createSignature).toHaveBeenNthCalledWith(1, "me:evm:smart", {
                type: "message",
                params: { message: "Hello, contract!", signer: "api-key", chain: "base-sepolia" },
            });

            // biome-ignore lint/suspicious/noExplicitAny: partial API response shape
            mockApiClient.createSignature.mockResolvedValue({ id: "sig-typed", status: "pending" } as any);
            await evmWallet.signTypedData({
                domain: {
                    name: "MyDApp",
                    version: "1",
                    chainId: 84532,
                    verifyingContract: "0x1234567890123456789012345678901234567890",
                },
                types: { Message: [{ name: "content", type: "string" }] },
                primaryType: "Message",
                message: { content: "Hello" },
                chain: "base-sepolia",
                options: { prepareOnly: true },
            });
            expect(mockApiClient.createSignature).toHaveBeenNthCalledWith(2, "me:evm:smart", {
                type: "typed-data",
                params: {
                    typedData: {
                        domain: {
                            name: "MyDApp",
                            version: "1",
                            chainId: 84532,
                            verifyingContract: "0x1234567890123456789012345678901234567890",
                            salt: undefined,
                        },
                        message: { content: "Hello" },
                        primaryType: "Message",
                        types: { Message: [{ name: "content", type: "string" }] },
                    },
                    signer: "api-key",
                    chain: "base-sepolia",
                },
            });
        });

        // pins evm.ts createTransaction signer branch ladder: null -> requireSigner().locator(); string -> passthrough
        it("EVM sendTransaction passes requireSigner locator by default and honors string signer override in createTransaction params", async () => {
            mockApiClient.createTransaction.mockResolvedValue(pendingTransactionResponse("txn-signer-default", "evm"));
            await evmWallet.sendTransaction({
                to: "0x00000000000000000000000000000000000000aa",
                options: { prepareOnly: true },
            });
            expect(mockApiClient.createTransaction).toHaveBeenNthCalledWith(1, "me:evm:smart", {
                params: {
                    signer: "api-key",
                    chain: "base-sepolia",
                    calls: [{ to: "0x00000000000000000000000000000000000000aa", value: "0", data: "0x" }],
                },
            });

            mockApiClient.createTransaction.mockResolvedValue(pendingTransactionResponse("txn-signer-override", "evm"));
            await evmWallet.sendTransaction({
                to: "0x00000000000000000000000000000000000000aa",
                options: { prepareOnly: true, signer: "external-wallet:0x00000000000000000000000000000000000000bb" },
            });
            expect(mockApiClient.createTransaction).toHaveBeenNthCalledWith(2, "me:evm:smart", {
                params: {
                    signer: "external-wallet:0x00000000000000000000000000000000000000bb",
                    chain: "base-sepolia",
                    calls: [{ to: "0x00000000000000000000000000000000000000aa", value: "0", data: "0x" }],
                },
            });
        });
    });

    describe("server-side wallet locator", () => {
        // pins wallet.ts walletLocator getter isServerSide branch: raw wallet address used as locator for subclass API calls
        it("subclass API calls use raw wallet address as locator when apiClient.isServerSide", async () => {
            // EVM: createTransaction + createSignature
            const evmApi = createMockApiClient({ isServerSide: true });
            const evmWallet = EVMWallet.from(await createMockWallet("base-sepolia", evmApi, "api-key"));
            evmApi.createTransaction.mockResolvedValue(pendingTransactionResponse("txn-ss-evm", "evm"));
            await evmWallet.sendTransaction({ transaction: "0xdeadbeef", options: { prepareOnly: true } });
            expect(evmApi.createTransaction).toHaveBeenCalledWith(EVM_ADDRESS, expect.anything());
            // biome-ignore lint/suspicious/noExplicitAny: partial API response shape
            evmApi.createSignature.mockResolvedValue({ id: "sig-ss-evm", status: "pending" } as any);
            await evmWallet.signMessage({ message: "hello", options: { prepareOnly: true } });
            expect(evmApi.createSignature).toHaveBeenCalledWith(EVM_ADDRESS, expect.anything());

            // Solana: createTransaction
            const solApi = createMockApiClient({ isServerSide: true });
            const solWallet = SolanaWallet.from(await createMockWallet("solana", solApi, "api-key"));
            solApi.createTransaction.mockResolvedValue(pendingTransactionResponse("txn-ss-sol", "solana"));
            await solWallet.sendTransaction({
                serializedTransaction: createMockSolanaSerializedTransaction(),
                options: { prepareOnly: true },
            });
            expect(solApi.createTransaction).toHaveBeenCalledWith(SOLANA_ADDRESS, expect.anything());

            // Stellar: createTransaction
            const xlmApi = createMockApiClient({ isServerSide: true });
            const xlmWallet = StellarWallet.from(await createMockWallet("stellar", xlmApi, "api-key"));
            xlmApi.createTransaction.mockResolvedValue(pendingTransactionResponse("txn-ss-xlm", "stellar"));
            await xlmWallet.sendTransaction({
                transaction: "AAAA-serialized-xdr",
                contractId: STELLAR_CONTRACT_ID,
                options: { prepareOnly: true },
            });
            expect(xlmApi.createTransaction).toHaveBeenCalledWith(STELLAR_ADDRESS, expect.anything());
        });
    });
});
