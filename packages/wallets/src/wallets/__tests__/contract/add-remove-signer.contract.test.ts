/**
 * CHARACTERIZATION (contract) tests for Wallet.addSigner / Wallet.removeSigner.
 *
 * These tests pin the CURRENT behavior of wallet.ts (signer registration, recovery-signer
 * wrapping, payload shapes, exact error classes and message strings) before the planned
 * decomposition into services. Do not "fix" behavior here — if these fail after a refactor,
 * the refactor changed the public contract.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CrossmintSDKError, WalletErrorCode } from "@crossmint/common-sdk-base";
import { Wallet } from "../../wallet";
import { WalletFactory } from "../../wallet-factory";
import type { ApiClient, GetWalletSuccessResponse } from "../../../api";
import type { ApiSourcedServerSignerConfig, SignerConfigForChain } from "../../../signers/types";
import { DeviceSignerNotSupportedError, InvalidSignerError } from "../../../utils/errors";
import { createMockApiClient, createMockWallet, type MockedApiClient } from "../test-helpers";

// Same module mock as wallet.test.ts: keeps server-signer key derivation deterministic
// (primary -> 0xDerivedServerAddress, legacy -> 0xLegacyServerAddress).
vi.mock("@/signers/server", async (importOriginal) => {
    const actual = await importOriginal<typeof import("@/signers/server")>();
    return {
        ...actual,
        deriveServerSignerDetails: vi.fn().mockReturnValue({
            derivedKeyBytes: new Uint8Array(32),
            derivedAddress: "0xDerivedServerAddress",
        }),
        deriveServerSignerCandidates: vi.fn().mockReturnValue({
            primary: { derivedKeyBytes: new Uint8Array(32), derivedAddress: "0xDerivedServerAddress" },
            legacy: { derivedKeyBytes: new Uint8Array(32).fill(1), derivedAddress: "0xLegacyServerAddress" },
        }),
        assembleServerSigner: vi.fn().mockReturnValue({
            type: "server",
            locator: () => "server:0xDerivedServerAddress",
            address: () => "0xDerivedServerAddress",
            status: undefined,
            signMessage: vi.fn().mockResolvedValue({ signature: "0xmocksig" }),
            signTransaction: vi.fn().mockResolvedValue({ signature: "0xmocksig" }),
        }),
    };
});

const SERVER_RECOVERY_GUARD_MESSAGE =
    "Cannot assemble server signer: no secret available. " +
    'Call wallet.useSigner({ type: "server", secret: ... }) first with the recovery server secret.';

async function catchRejection(promise: Promise<unknown>): Promise<unknown> {
    try {
        await promise;
    } catch (error) {
        return error;
    }
    throw new Error("Expected promise to reject, but it resolved");
}

describe("contract: add-remove-signer", () => {
    describe("addSigner fresh registration — error contract (EVM)", () => {
        let mockApiClient: MockedApiClient;
        let evmWallet: Wallet<"base-sepolia">;

        beforeEach(async () => {
            vi.clearAllMocks();
            vi.useFakeTimers();
            mockApiClient = createMockApiClient();
            evmWallet = await createMockWallet("base-sepolia", mockApiClient, "api-key");
        });

        afterEach(() => {
            vi.useRealTimers();
        });

        // pins wallet.ts addSigner: chains[this.chain].status === "failed" → InvalidSignerError with parameterized message + JSON details (wallet.ts:901-911)
        it("addSigner throws InvalidSignerError 'Signer registration failed for chain base-sepolia (signer: external-wallet:0x456)' when registration response chain status is failed", async () => {
            mockApiClient.registerSigner.mockResolvedValue({
                type: "external-wallet",
                address: "0x456",
                locator: "external-wallet:0x456",
                chains: {
                    "base-sepolia": { id: "sig-fail", status: "failed" },
                },
            } as any);

            const caught = await catchRejection(evmWallet.addSigner({ type: "external-wallet", address: "0x456" }));

            expect(caught).toBeInstanceOf(InvalidSignerError);
            expect((caught as InvalidSignerError).message).toBe(
                "Signer registration failed for chain base-sepolia (signer: external-wallet:0x456)"
            );
            expect((caught as InvalidSignerError).code).toBe(WalletErrorCode.SIGNER_INVALID);
            // details is the JSON-stringified chain entry from the response
            expect((caught as InvalidSignerError).details).toBe(JSON.stringify({ id: "sig-fail", status: "failed" }));
        });

        // pins wallet.ts addSigner: mapApiSignerToSigner returns null → plain Error before the chains/transaction extraction (wallet.ts:877-881)
        it("addSigner throws 'No approval found for chain base-sepolia in register signer response' when chains map has entries only for other chains", async () => {
            mockApiClient.registerSigner.mockResolvedValue({
                type: "external-wallet",
                address: "0x456",
                locator: "external-wallet:0x456",
                chains: {
                    "polygon-amoy": { id: "sig-poly", status: "success" },
                },
            } as any);

            const caught = await catchRejection(evmWallet.addSigner({ type: "external-wallet", address: "0x456" }));

            expect(caught).toBeInstanceOf(Error);
            // Plain Error, NOT a CrossmintSDKError subclass
            expect(caught).not.toBeInstanceOf(CrossmintSDKError);
            expect((caught as Error).message).toBe(
                "No approval found for chain base-sepolia in register signer response"
            );
        });

        // pins wallet.ts addSigner: error response with code DEVICE_SIGNER_NOT_SUPPORTED → DeviceSignerNotSupportedError with raw API message, checked before InvalidSignerError (wallet.ts:871-873)
        it("addSigner rejects with DeviceSignerNotSupportedError carrying the API message when error code is DEVICE_SIGNER_NOT_SUPPORTED", async () => {
            mockApiClient.registerSigner.mockResolvedValue({
                error: true,
                message: "Device signers are not currently supported for this wallet.",
                code: "DEVICE_SIGNER_NOT_SUPPORTED",
            } as any);

            const caught = await catchRejection(evmWallet.addSigner({ type: "external-wallet", address: "0x456" }));

            expect(caught).toBeInstanceOf(DeviceSignerNotSupportedError);
            // Message is the raw response.message passthrough — no prefix, no JSON quoting
            expect((caught as DeviceSignerNotSupportedError).message).toBe(
                "Device signers are not currently supported for this wallet."
            );
            expect((caught as DeviceSignerNotSupportedError).code).toBe(WalletErrorCode.SIGNER_INVALID);
        });

        // pins wallet.ts addSigner: generic registration error → InvalidSignerError with JSON.stringify-ed message (note the literal quotes) (wallet.ts:874)
        it("addSigner rejects with InvalidSignerError and JSON-stringified API message on registration error", async () => {
            mockApiClient.registerSigner.mockResolvedValue({
                error: true,
                message: "Internal server error",
            } as any);

            const caught = await catchRejection(evmWallet.addSigner({ type: "external-wallet", address: "0x456" }));

            expect(caught).toBeInstanceOf(InvalidSignerError);
            // JSON.stringify wraps the message in quotes — that formatting is part of the contract
            expect((caught as InvalidSignerError).message).toBe('Failed to register signer: "Internal server error"');
            expect((caught as InvalidSignerError).code).toBe(WalletErrorCode.SIGNER_INVALID);
        });
    });

    describe("addSigner fresh registration — payload contract", () => {
        let mockApiClient: MockedApiClient;
        let evmWallet: Wallet<"base-sepolia">;

        beforeEach(async () => {
            vi.clearAllMocks();
            vi.useFakeTimers();
            mockApiClient = createMockApiClient();
            evmWallet = await createMockWallet("base-sepolia", mockApiClient, "api-key");
        });

        afterEach(() => {
            vi.useRealTimers();
        });

        // pins wallet.ts addSigner: ...(options?.scopes != null && { scopes }) spread into the registerSigner payload (wallet.ts:861-865)
        it("addSigner forwards scopes array to registerSigner payload and omits the key when not provided", async () => {
            mockApiClient.registerSigner.mockResolvedValue({
                type: "external-wallet",
                address: "0x456",
                locator: "external-wallet:0x456",
                chains: {
                    "base-sepolia": { id: "sig-123", status: "success" },
                },
            } as any);

            const scopes = [
                { type: "transfer" as const, tokenLocator: "base-sepolia:usdc", spendingLimit: { amount: "100" } },
            ];

            await evmWallet.addSigner({ type: "external-wallet", address: "0x456" }, { scopes });
            await evmWallet.addSigner({ type: "external-wallet", address: "0x456" });

            expect(mockApiClient.registerSigner).toHaveBeenCalledTimes(2);

            // With scopes: the payload contains exactly signer, chain and scopes
            const payloadWithScopes = mockApiClient.registerSigner.mock.calls[0][1] as Record<string, unknown>;
            expect(payloadWithScopes).toEqual({
                signer: "external-wallet:0x456",
                chain: "base-sepolia",
                scopes,
            });

            // Without scopes: the scopes key must be ABSENT (not merely undefined)
            const payloadWithoutScopes = mockApiClient.registerSigner.mock.calls[1][1] as Record<string, unknown>;
            expect("scopes" in payloadWithoutScopes).toBe(false);
            expect(payloadWithoutScopes).toEqual({
                signer: "external-wallet:0x456",
                chain: "base-sepolia",
            });
        });

        // pins wallet.ts addSigner: device config with non-null publicKey → {type, publicKey, name} object payload, not a locator string (wallet.ts:851-859)
        it("addSigner with device config sends {type:'device', publicKey, name} object to registerSigner, not a locator string", async () => {
            mockApiClient.registerSigner.mockResolvedValue({
                type: "device",
                locator: "device:mockKey123",
                publicKey: { x: "0x01", y: "0x02" },
                chains: {
                    "base-sepolia": { id: "sig-dev", status: "success" },
                },
            } as any);

            const deviceConfig = {
                type: "device" as const,
                publicKey: { x: "0x01", y: "0x02" },
                name: "My Device",
                locator: "device:mockKey123",
            };

            const result = await evmWallet.addSigner(deviceConfig as any);

            // The idempotency pre-check uses the locator string
            expect(mockApiClient.getSigner).toHaveBeenCalledWith("me:evm:smart", "device:mockKey123");

            // The registration payload sends the device OBJECT (with publicKey) — exactly these keys
            const payload = mockApiClient.registerSigner.mock.calls[0][1] as Record<string, unknown>;
            expect(typeof payload.signer).toBe("object");
            expect(payload.signer).toEqual({
                type: "device",
                publicKey: { x: "0x01", y: "0x02" },
                name: "My Device",
            });
            expect(payload.chain).toBe("base-sepolia");

            expect(result.type).toBe("device");
            expect(result.status).toBe("success");
        });

        // pins wallet.ts addSigner: server config resolved to `server:<derivedAddress>` locator string BEFORE withRecoverySigner; same string used for getSigner pre-check and registerSigner (wallet.ts:810-813,846-848)
        it("addSigner with server config sends derived 'server:<address>' locator string to getSigner and registerSigner", async () => {
            mockApiClient.registerSigner.mockResolvedValue({
                type: "server",
                address: "0xDerivedServerAddress",
                locator: "server:0xDerivedServerAddress",
                chains: {
                    "base-sepolia": { id: "sig-srv", status: "success" },
                },
            } as any);

            const result = await evmWallet.addSigner({ type: "server", secret: "super-secret" } as any);

            // Idempotency pre-check uses the DERIVED locator string, not the raw config
            expect(mockApiClient.getSigner).toHaveBeenCalledWith("me:evm:smart", "server:0xDerivedServerAddress");

            // registerSigner receives the derived locator STRING as the signer field
            const payload = mockApiClient.registerSigner.mock.calls[0][1] as Record<string, unknown>;
            expect(payload.signer).toBe("server:0xDerivedServerAddress");
            expect(typeof payload.signer).toBe("string");
            expect(payload.chain).toBe("base-sepolia");

            // getSigner pre-check happens before registration
            const getSignerOrder = mockApiClient.getSigner.mock.invocationCallOrder[0];
            const registerOrder = mockApiClient.registerSigner.mock.invocationCallOrder[0];
            expect(getSignerOrder).toBeLessThan(registerOrder);

            expect(result.locator).toBe("server:0xDerivedServerAddress");
            expect(result.status).toBe("success");
        });
    });

    describe("addSigner idempotency / prepareOnly return shapes", () => {
        let mockApiClient: MockedApiClient;
        let evmWallet: Wallet<"base-sepolia">;

        beforeEach(async () => {
            vi.clearAllMocks();
            vi.useFakeTimers();
            mockApiClient = createMockApiClient();
            evmWallet = await createMockWallet("base-sepolia", mockApiClient, "api-key");
        });

        afterEach(() => {
            vi.useRealTimers();
        });

        // pins wallet.ts completeSignerRegistration: prepareOnly + already approved (no pending op) → `{ ...signer }` as fetched, no ids, status NOT normalized (wallet.ts:929-932)
        it("addSigner prepareOnly returns signer without signatureId/transactionId when signer already approved", async () => {
            mockApiClient.getSigner.mockResolvedValueOnce({
                type: "external-wallet",
                address: "0x456",
                locator: "external-wallet:0x456",
                chains: {
                    "base-sepolia": { id: "sig-done", status: "active" },
                },
            } as any);

            const result = await evmWallet.addSigner(
                { type: "external-wallet", address: "0x456" },
                { prepareOnly: true }
            );

            // No registration, no approvals
            expect(mockApiClient.registerSigner).not.toHaveBeenCalled();
            expect(mockApiClient.approveSignature).not.toHaveBeenCalled();
            expect(mockApiClient.approveTransaction).not.toHaveBeenCalled();

            // Exact return shape: the fetched signer fields only, original status preserved
            expect(result).toEqual({
                type: "external-wallet",
                address: "0x456",
                locator: "external-wallet:0x456",
                status: "active",
            });
            expect(result).not.toHaveProperty("signatureId");
            expect(result).not.toHaveProperty("transactionId");
        });

        // pins wallet.ts isApprovedSignerStatus: 'active' counts as approved; non-prepareOnly result normalized to 'success' (wallet.ts:823,1288-1290,970)
        it("addSigner returns early without registering when existing signer status is 'active' and normalizes status to 'success'", async () => {
            mockApiClient.getSigner.mockResolvedValueOnce({
                type: "external-wallet",
                address: "0x456",
                locator: "external-wallet:0x456",
                chains: {
                    "base-sepolia": { id: "sig-done", status: "active" },
                },
            } as any);

            const result = await evmWallet.addSigner({ type: "external-wallet", address: "0x456" });

            expect(mockApiClient.registerSigner).not.toHaveBeenCalled();
            // 'active' fetched status is normalized to 'success' on the non-prepareOnly path
            expect(result.status).toBe("success");
            expect(result.locator).toBe("external-wallet:0x456");
        });
    });

    describe("withRecoverySigner — signer swap/restore and guards", () => {
        let mockApiClient: MockedApiClient;

        beforeEach(() => {
            vi.clearAllMocks();
            mockApiClient = createMockApiClient();
        });

        // pins wallet.ts withRecoverySigner: swaps #signer to the recovery signer during the operation and restores the ORIGINAL signer in finally — success AND throw paths (wallet.ts:1236-1261)
        it("addSigner restores the original active signer after success and after operation failure", async () => {
            const wallet = await createMockWallet("base-sepolia", mockApiClient, "external-wallet");

            const originalSigner = wallet.signer;
            expect(originalSigner?.type).toBe("external-wallet");

            let signerTypeDuringOperation: string | undefined;
            mockApiClient.registerSigner.mockImplementation(async () => {
                signerTypeDuringOperation = wallet.signer?.type;
                return {
                    type: "email",
                    address: "0xNewEmail",
                    locator: "email:new@example.com",
                    chains: { "base-sepolia": { id: "sig-new", status: "success" } },
                } as any;
            });

            // Success path
            await wallet.addSigner({ type: "email", email: "new@example.com" } as any);
            // During the operation the wallet signs with the recovery (api-key) signer...
            expect(signerTypeDuringOperation).toBe("api-key");
            // ...and afterwards the ORIGINAL signer instance is restored
            expect(wallet.signer).toBe(originalSigner);
            expect(wallet.signer?.type).toBe("external-wallet");

            // Failure path: registration error must still restore the original signer (finally)
            mockApiClient.registerSigner.mockImplementation(async () => ({ error: true, message: "boom" }) as any);
            await expect(wallet.addSigner({ type: "email", email: "other@example.com" } as any)).rejects.toThrow(
                InvalidSignerError
            );
            expect(wallet.signer).toBe(originalSigner);
        });

        // pins wallet.ts withRecoverySigner: API-sourced server recovery without cached resolution → plain Error with the FULL guard message (wallet.ts:1238-1243)
        it("addSigner throws the full 'Cannot assemble server signer: no secret available...' guard message", async () => {
            const wallet = new Wallet(
                {
                    chain: "base-sepolia" as const,
                    address: "0x1234567890123456789012345678901234567890",
                    recovery: { type: "server", address: "0xRecoveryAddress" } as ApiSourcedServerSignerConfig,
                },
                mockApiClient as unknown as ApiClient
            );

            const caught = await catchRejection(wallet.addSigner({ type: "external-wallet", address: "0x456" }));

            expect(caught).toBeInstanceOf(Error);
            expect(caught).not.toBeInstanceOf(CrossmintSDKError);
            expect((caught as Error).message).toBe(SERVER_RECOVERY_GUARD_MESSAGE);
            // Guard fires before any API interaction
            expect(mockApiClient.getSigner).not.toHaveBeenCalled();
            expect(mockApiClient.registerSigner).not.toHaveBeenCalled();
        });
    });

    describe("removeSigner runs under the recovery signer", () => {
        let mockApiClient: MockedApiClient;

        beforeEach(() => {
            vi.clearAllMocks();
            vi.useFakeTimers();
            mockApiClient = createMockApiClient();
        });

        afterEach(() => {
            vi.useRealTimers();
        });

        // pins wallet.ts removeSigner: wrapped in withRecoverySigner — same server-recovery guard as addSigner, thrown BEFORE the removeSigner API call (wallet.ts:994,1238-1243)
        it("removeSigner throws the full server recovery guard error before calling the API", async () => {
            const wallet = new Wallet(
                {
                    chain: "base-sepolia" as const,
                    address: "0x1234567890123456789012345678901234567890",
                    recovery: { type: "server", address: "0xRecoveryAddress" } as ApiSourcedServerSignerConfig,
                },
                mockApiClient as unknown as ApiClient
            );

            const caught = await catchRejection(wallet.removeSigner({ type: "external-wallet", address: "0x456" }));

            expect(caught).toBeInstanceOf(Error);
            expect((caught as Error).message).toBe(SERVER_RECOVERY_GUARD_MESSAGE);
            expect(mockApiClient.removeSigner).not.toHaveBeenCalled();
        });

        // pins wallet.ts removeSigner: approveTransactionAndWait executes with the swapped-in recovery signer (recovery external-wallet onSign receives the pending message) (wallet.ts:994-1019)
        it("removeSigner approves the removal transaction with the recovery signer (external-wallet onSign)", async () => {
            // Wallet fetched from the API: recovery is external-wallet without onSign
            mockApiClient.getWallet.mockResolvedValue({
                chainType: "evm",
                type: "smart",
                address: "0x1234567890123456789012345678901234567890",
                config: {
                    adminSigner: { type: "external-wallet", address: "0xRecoveryWallet" },
                    delegatedSigners: [],
                },
                createdAt: Date.now(),
            } as unknown as GetWalletSuccessResponse);
            const walletFactory = new WalletFactory(mockApiClient as unknown as ApiClient);
            const wallet = await walletFactory.getWallet({ chain: "base-sepolia" });
            vi.spyOn(wallet, "signers").mockResolvedValue([]);

            // useSigner upgrades #recovery with the onSign callback
            const onSign = vi.fn().mockResolvedValue("0xsigned");
            await wallet.useSigner({
                type: "external-wallet",
                address: "0xRecoveryWallet",
                onSign,
            } as unknown as SignerConfigForChain<"base-sepolia">);

            mockApiClient.removeSigner.mockResolvedValue({
                id: "txn-rm",
                status: "awaiting-approval",
                approvals: { pending: [], submitted: [] },
            } as any);

            // First getTransaction: pending approval addressed to the recovery signer
            mockApiClient.getTransaction.mockResolvedValueOnce({
                id: "txn-rm",
                status: "awaiting-approval",
                chainType: "evm",
                approvals: {
                    pending: [
                        {
                            message: "0xdeadbeef",
                            signer: { locator: "external-wallet:0xRecoveryWallet" },
                        },
                    ],
                },
                onChain: {},
            } as any);
            mockApiClient.approveTransaction.mockResolvedValue({
                id: "txn-rm",
                status: "pending",
            } as any);
            // Polling after approval: transaction confirms
            mockApiClient.getTransaction.mockResolvedValue({
                id: "txn-rm",
                status: "success",
                onChain: { txId: "0xremovalhash", explorerLink: "https://sepolia.basescan.org/tx/0xremovalhash" },
            } as any);

            const removePromise = wallet.removeSigner({ type: "external-wallet", address: "0x456" });
            await vi.runAllTimersAsync();
            const result = await removePromise;

            expect(mockApiClient.removeSigner).toHaveBeenCalledWith(expect.any(String), "external-wallet:0x456", {
                chain: "base-sepolia",
            });
            // The recovery signer's onSign callback signed the pending approval message
            expect(onSign).toHaveBeenCalledWith("0xdeadbeef");
            expect(mockApiClient.approveTransaction).toHaveBeenCalledWith(expect.any(String), "txn-rm", {
                approvals: [{ signature: "0xsigned", signer: "external-wallet:0xRecoveryWallet" }],
            });
            expect(result).toEqual({ transactionId: "txn-rm", status: "success" });
        });

        // pins wallet.ts removeSigner/resolveSignerLocator: server config resolves to the derived `server:<address>` locator for the API call (wallet.ts:991,1222-1227)
        it("removeSigner with server config passes derived 'server:<address>' locator to apiClient.removeSigner", async () => {
            const wallet = await createMockWallet("base-sepolia", mockApiClient, "api-key");

            mockApiClient.removeSigner.mockResolvedValue({
                id: "txn-rm-2",
                status: "awaiting-approval",
                approvals: { pending: [], submitted: [] },
            } as any);

            const result = await wallet.removeSigner({ type: "server", secret: "super-secret" } as any, {
                prepareOnly: true,
            });

            expect(mockApiClient.removeSigner).toHaveBeenCalledWith("me:evm:smart", "server:0xDerivedServerAddress", {
                chain: "base-sepolia",
            });
            expect(result.transactionId).toBe("txn-rm-2");
            expect(result.status).toBeUndefined();
            expect(mockApiClient.approveTransaction).not.toHaveBeenCalled();
            expect(mockApiClient.getTransaction).not.toHaveBeenCalled();
        });
    });

    describe("stellar registration chain and transaction extraction", () => {
        let mockApiClient: MockedApiClient;
        let stellarWallet: Wallet<"stellar">;

        beforeEach(async () => {
            vi.clearAllMocks();
            vi.useFakeTimers();
            mockApiClient = createMockApiClient();
            stellarWallet = await createMockWallet("stellar", mockApiClient, "api-key");
        });

        afterEach(() => {
            vi.useRealTimers();
        });

        // pins wallet.ts getSignerRegistrationChain: stellar → chain undefined in the payload; pending op extracted from response.transaction (wallet.ts:886-893,1229-1234)
        it("stellar addSigner sends chain undefined and extracts pending operation from response.transaction", async () => {
            mockApiClient.registerSigner.mockResolvedValue({
                type: "external-wallet",
                address: "GABC123",
                locator: "external-wallet:GABC123",
                transaction: { id: "txn-stellar", status: "pending" },
            } as any);

            const result = await stellarWallet.addSigner({ type: "external-wallet", address: "GABC123" } as any, {
                prepareOnly: true,
            });

            expect(mockApiClient.registerSigner).toHaveBeenCalledTimes(1);
            expect(mockApiClient.registerSigner.mock.calls[0][0]).toBe("me:stellar:smart");
            const payload = mockApiClient.registerSigner.mock.calls[0][1] as Record<string, unknown>;
            expect(payload.signer).toBe("external-wallet:GABC123");
            // chain key is present in the payload but explicitly undefined for stellar
            expect("chain" in payload).toBe(true);
            expect(payload.chain).toBeUndefined();

            expect(result).toEqual({
                type: "external-wallet",
                address: "GABC123",
                locator: "external-wallet:GABC123",
                status: "pending",
                transactionId: "txn-stellar",
            });
        });

        // pins wallet.ts addSigner: stellar shares the solana branch — missing response.transaction → exact 'Expected transaction in response for Solana/Stellar chain' (wallet.ts:886-892)
        it("stellar addSigner throws 'Expected transaction in response for Solana/Stellar chain' when transaction is missing", async () => {
            mockApiClient.registerSigner.mockResolvedValue({
                type: "external-wallet",
                address: "GABC123",
                locator: "external-wallet:GABC123",
                chains: {},
            } as any);

            const caught = await catchRejection(
                stellarWallet.addSigner({ type: "external-wallet", address: "GABC123" } as any)
            );

            expect(caught).toBeInstanceOf(Error);
            expect((caught as Error).message).toBe("Expected transaction in response for Solana/Stellar chain");
        });
    });
});
