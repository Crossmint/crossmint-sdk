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
import { Wallet } from "../../wallets/wallet";
import { EVMWallet } from "../../wallets/evm";
import { SolanaWallet } from "../../wallets/solana";
import { StellarWallet } from "../../wallets/stellar";
import { deriveServerSignerCandidates } from "../../signers/server";
import type { ApiClient } from "../../api";
import type { Chain } from "../../chains/chains";
import {
    createMockApiClient,
    createMockWallet,
    createMockSolanaSerializedTransaction,
    type MockedApiClient,
} from "../../wallets/__tests__/test-helpers";

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

describe("Wallet integration — from() chain-subclass rewrap state carryover", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    describe("from() rewrap state carryover", () => {
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
                /This wallet has multiple signers configured/
            );
            // Thrown before any API call is made
            expect(mockApiClient.createSignature).not.toHaveBeenCalled();
        });

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

            await expect(evmWallet.signMessage({ message: "hello" })).rejects.toThrow(/server secret/);
            expect(mockApiClient.createSignature).not.toHaveBeenCalled();
        });

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
});
