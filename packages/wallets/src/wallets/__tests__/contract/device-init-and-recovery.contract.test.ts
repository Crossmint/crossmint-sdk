/**
 * CHARACTERIZATION (contract) tests for device signer init and recovery in wallet.ts.
 *
 * These tests pin the CURRENT behavior of initDefaultSigner / initDeviceSigner /
 * recover() / preAuthIfNeeded / resumePendingDeviceSignerApproval before wallet.ts
 * is decomposed into services. Exact error classes AND message strings, API call
 * arguments/counts, and state effects are all part of the contract.
 *
 * Do not "fix" behavior here — if the implementation changes observable behavior,
 * these tests are supposed to fail.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { Wallet } from "../../wallet";
import type { ApiClient } from "../../../api";
import type { SignerAdapter } from "../../../signers/types";
import { NonCustodialSigner } from "../../../signers/non-custodial";
import { WalletCreationError } from "../../../utils/errors";
import { walletsLogger } from "../../../logger";
import { createMockApiClient, type MockedApiClient } from "../test-helpers";

vi.mock("@/utils/device-signers", async (importOriginal) => {
    const actual = await importOriginal<typeof import("@/utils/device-signers")>();
    return {
        ...actual,
        createDeviceSigner: vi.fn().mockResolvedValue({
            type: "device",
            publicKey: { x: "0x01", y: "0x02" },
            locator: "device:mockNewKey",
            name: "Test Device",
        }),
    };
});

const EVM_ADDRESS = "0x1234567890123456789012345678901234567890";
const SOLANA_ADDRESS = "9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM";

// Helper: create a mock DeviceSignerKeyStorage (same shape as wallet.test.ts)
const createMockDeviceKeyStorage = () => ({
    generateKey: vi.fn().mockResolvedValue("mockPublicKeyBase64"),
    getKey: vi.fn().mockResolvedValue(null),
    hasKey: vi.fn().mockResolvedValue(false),
    mapAddressToKey: vi.fn().mockResolvedValue(undefined),
    deleteKey: vi.fn().mockResolvedValue(undefined),
    signMessage: vi.fn().mockResolvedValue({ r: "0x1", s: "0x2" }),
    getDeviceName: vi.fn().mockReturnValue("Test Device"),
    apiKey: "test-api-key",
});

// Helper: create a mock SignerAdapter for device type
const createDeviceSignerAdapter = (locatorValue = "device:testkey123", status?: string): SignerAdapter =>
    ({
        type: "device",
        status: status as any,
        locator: () => locatorValue as any,
        signMessage: vi.fn(),
        signTransaction: vi.fn(),
    }) as unknown as SignerAdapter;

// Helper: mock getSigner to return an approved EVM device signer
const mockGetSignerApprovedDevice = (mockApiClient: MockedApiClient, locator = "device:mockNewKey") => {
    mockApiClient.getSigner.mockResolvedValue({
        type: "device",
        locator,
        publicKey: { x: "1", y: "2" },
        chains: { "base-sepolia": { status: "success" } },
    } as any);
};

describe("contract: device-init-and-recovery", () => {
    let mockApiClient: MockedApiClient;

    beforeEach(() => {
        vi.clearAllMocks();
        mockApiClient = createMockApiClient();
    });

    describe("initDefaultSigner priority ladder", () => {
        // pins wallet.ts initDefaultSigner: 0-delegated-signers branch assembles #recovery with isAdminSigner=true (status "active", no getSigner)
        it("auto-assembles recovery signer as admin with status 'active' and no getSigner call when wallet has zero delegated signers", async () => {
            const wallet = new Wallet(
                {
                    chain: "base-sepolia",
                    address: EVM_ADDRESS,
                    recovery: { type: "api-key" } as any,
                    // no signers, no deviceSignerKeyStorage
                },
                mockApiClient as unknown as ApiClient
            );

            await wallet.waitForInit();

            expect(wallet.signer).toBeDefined();
            expect(wallet.signer?.type).toBe("api-key");
            expect(wallet.signer?.locator()).toBe("api-key");
            // Admin signers get status "active" hardcoded — the getSigner API call is skipped
            expect(wallet.signer?.status).toBe("active");
            expect(mockApiClient.getSigner).not.toHaveBeenCalled();
        });

        // pins wallet.ts initDefaultSigner: >1 initial signers → signerToAssemble = null → signer stays undefined
        it("leaves signer undefined after waitForInit when wallet has more than one delegated signer", async () => {
            const wallet = new Wallet(
                {
                    chain: "base-sepolia",
                    address: EVM_ADDRESS,
                    recovery: { type: "api-key" } as any,
                    signers: [
                        { type: "email", email: "a@example.com" },
                        { type: "phone", phone: "+15551234567" },
                    ] as any,
                },
                mockApiClient as unknown as ApiClient
            );

            await wallet.waitForInit();

            // User must call useSigner(); no auto-assembly (and no recovery fallback) happens
            expect(wallet.signer).toBeUndefined();
            expect(mockApiClient.getSigner).not.toHaveBeenCalled();
        });

        // pins wallet.ts initDefaultSigner: exactly 1 delegated signer → assembled with isAdminSigner=false, status fetched via getSigner
        it("auto-assembles the single delegated non-device signer with status fetched via getSigner", async () => {
            mockApiClient.getSigner.mockResolvedValue({
                type: "email",
                email: "user@example.com",
                address: "0xSignerAddress00000000000000000000000000",
                locator: "email:user@example.com",
                chains: { "base-sepolia": { status: "success" } },
            } as any);

            const wallet = new Wallet(
                {
                    chain: "base-sepolia",
                    address: EVM_ADDRESS,
                    recovery: { type: "api-key" } as any,
                    signers: [{ type: "email", email: "user@example.com" }] as any,
                },
                mockApiClient as unknown as ApiClient
            );

            await wallet.waitForInit();

            expect(wallet.signer).toBeDefined();
            expect(wallet.signer?.type).toBe("email");
            // Delegated (non-admin) signer: status comes from the API, not hardcoded "active"
            expect(wallet.signer?.status).toBe("success");
            expect(mockApiClient.getSigner).toHaveBeenCalledTimes(1);
            expect(mockApiClient.getSigner).toHaveBeenCalledWith("me:evm:smart", "email:user@example.com");
        });

        // pins wallet.ts initDefaultSigner catch: assembly failure is swallowed (warn log), signer undefined, waitForInit resolves
        it("leaves signer undefined and resolves waitForInit without throwing when ladder auto-assembly fails", async () => {
            // getSignerState only try/catches the getSigner call itself; a malformed success
            // response makes mapApiSignerToSigner throw inside assembleFullSigner, which the
            // initDefaultSigner catch must swallow.
            mockApiClient.getSigner.mockResolvedValue({ type: "mystery-unknown-type" } as any);

            const wallet = new Wallet(
                {
                    chain: "base-sepolia",
                    address: EVM_ADDRESS,
                    recovery: { type: "api-key" } as any,
                    signers: [{ type: "email", email: "user@example.com" }] as any,
                },
                mockApiClient as unknown as ApiClient
            );

            // waitForInit must RESOLVE — a rejection here would poison every later preAuthIfNeeded()
            await expect(wallet.waitForInit()).resolves.toBeUndefined();

            expect(wallet.signer).toBeUndefined();
            expect(walletsLogger.warn).toHaveBeenCalledWith(
                "wallet.initDefaultSigner.autoAssemblyFailed",
                expect.objectContaining({
                    recoveryType: "api-key",
                    signerCount: 1,
                    error: expect.any(Error),
                })
            );
        });
    });

    describe("initDeviceSigner error handling", () => {
        // pins wallet.ts initDeviceSigner catch: resolveDeviceSignerAvailability failure → error log + needsRecovery=true, init resolves
        it("sets needsRecovery true and resolves waitForInit when device key storage throws during init", async () => {
            const mockStorage = createMockDeviceKeyStorage();
            mockStorage.getKey.mockRejectedValue(new Error("Storage blocked"));

            const wallet = new Wallet(
                {
                    chain: "base-sepolia",
                    address: EVM_ADDRESS,
                    recovery: { type: "api-key" } as any,
                    options: { deviceSignerKeyStorage: mockStorage as any },
                },
                mockApiClient as unknown as ApiClient
            );

            // The storage error must NOT escape the constructor-created init promise
            await expect(wallet.waitForInit()).resolves.toBeUndefined();

            expect(wallet.needsRecovery()).toBe(true);
            expect(wallet.signer).toBeUndefined();
            expect(walletsLogger.error).toHaveBeenCalledWith(
                "wallet.initDeviceSigner.error",
                expect.objectContaining({ error: expect.any(Error) })
            );
        });
    });

    describe("preAuthIfNeeded", () => {
        // pins wallet.ts preAuthIfNeeded: #recovering single-flight guard dedupes concurrent recover() calls, reset in finally
        it("concurrent operations share a single recover() invocation via preAuthIfNeeded", async () => {
            const mockStorage = createMockDeviceKeyStorage();

            const wallet = new Wallet(
                {
                    chain: "base-sepolia",
                    address: EVM_ADDRESS,
                    recovery: { type: "api-key" } as any,
                    options: { deviceSignerKeyStorage: mockStorage as any },
                },
                mockApiClient as unknown as ApiClient
            );
            vi.spyOn(wallet, "signers").mockResolvedValue([] as any);
            await wallet.waitForInit();
            expect(wallet.needsRecovery()).toBe(true);

            const recoverSpy = vi.spyOn(wallet, "recover");

            // addSigner's upfront getSignerState check — signer not yet registered
            mockApiClient.getSigner.mockResolvedValueOnce({ error: { message: "not found" } } as any);
            // assembleFullSigner after registration — signer approved
            mockGetSignerApprovedDevice(mockApiClient);
            mockApiClient.registerSigner.mockResolvedValue({
                type: "device",
                locator: "device:mockNewKey",
                publicKey: { x: "0x01", y: "0x02" },
                chains: { "base-sepolia": { status: "success" } },
            } as any);
            mockApiClient.send.mockResolvedValue({ id: "tx-prep-1" } as any);

            const [tx1, tx2] = await Promise.all([
                wallet.send(EVM_ADDRESS, "usdc", "1.0", { prepareOnly: true }),
                wallet.send(EVM_ADDRESS, "usdc", "1.0", { prepareOnly: true }),
            ]);

            // Exactly ONE recover() (and one device-key registration) for both operations
            expect(recoverSpy).toHaveBeenCalledTimes(1);
            expect(mockApiClient.registerSigner).toHaveBeenCalledTimes(1);
            expect(mockApiClient.send).toHaveBeenCalledTimes(2);
            expect(tx1.transactionId).toBe("tx-prep-1");
            expect(tx2.transactionId).toBe("tx-prep-1");
            expect(wallet.signer?.type).toBe("device");

            // #recovering is reset to null in finally — a later operation re-enters recover()
            await wallet.send(EVM_ADDRESS, "usdc", "1.0", { prepareOnly: true });
            expect(recoverSpy).toHaveBeenCalledTimes(2);
            // ...but the cached approval fast-path prevents a second registration
            expect(mockApiClient.registerSigner).toHaveBeenCalledTimes(1);
        });

        // pins wallet.ts preAuthIfNeeded: NonCustodialSigner instances get ensureAuthenticated() before the operation
        it("calls ensureAuthenticated on NonCustodialSigner before signing operations", async () => {
            const ensureAuthSpy = vi
                .spyOn(NonCustodialSigner.prototype, "ensureAuthenticated")
                .mockResolvedValue(undefined);
            try {
                // Email recovery + zero delegated signers → ladder assembles an
                // EVMNonCustodialSigner (instanceof NonCustodialSigner) as admin.
                const wallet = new Wallet(
                    {
                        chain: "base-sepolia",
                        address: EVM_ADDRESS,
                        recovery: { type: "email", email: "rec@example.com" } as any,
                    },
                    mockApiClient as unknown as ApiClient
                );
                await wallet.waitForInit();
                expect(wallet.signer).toBeInstanceOf(NonCustodialSigner);

                mockApiClient.send.mockResolvedValue({ id: "tx-prep-ncs" } as any);

                await wallet.send(EVM_ADDRESS, "usdc", "1.0", { prepareOnly: true });

                expect(ensureAuthSpy).toHaveBeenCalledTimes(1);
                // ensureAuthenticated runs BEFORE the transaction is created
                expect(ensureAuthSpy.mock.invocationCallOrder[0]).toBeLessThan(
                    mockApiClient.send.mock.invocationCallOrder[0]
                );
            } finally {
                ensureAuthSpy.mockRestore();
            }
        });

        // pins wallet.ts preAuthIfNeeded: ensureAuthenticated is only invoked for NonCustodialSigner instances
        it("does not call ensureAuthenticated for non-NonCustodialSigner signers", async () => {
            const ensureAuthSpy = vi
                .spyOn(NonCustodialSigner.prototype, "ensureAuthenticated")
                .mockResolvedValue(undefined);
            try {
                const wallet = new Wallet(
                    {
                        chain: "base-sepolia",
                        address: EVM_ADDRESS,
                        recovery: { type: "api-key" } as any,
                    },
                    mockApiClient as unknown as ApiClient
                );
                await wallet.waitForInit();
                expect(wallet.signer?.type).toBe("api-key");

                mockApiClient.send.mockResolvedValue({ id: "tx-prep-apikey" } as any);

                await wallet.send(EVM_ADDRESS, "usdc", "1.0", { prepareOnly: true });

                expect(ensureAuthSpy).not.toHaveBeenCalled();
            } finally {
                ensureAuthSpy.mockRestore();
            }
        });
    });

    describe("resumePendingDeviceSignerApproval guards", () => {
        // pins wallet.ts resumePendingDeviceSignerApproval: API-sourced server recovery without resolved secret throws before swapping #signer
        it("throws 'Cannot resume pending approval: no secret available' when resuming with API-sourced server recovery and no resolved secret", async () => {
            const deviceSigner = createDeviceSignerAdapter("device:testkey123", undefined);
            const wallet = new Wallet(
                {
                    chain: "base-sepolia",
                    address: EVM_ADDRESS,
                    // API-sourced server config: type server, address only, no secret
                    recovery: { type: "server", address: "0xRecoveryServerSignerAddress" } as any,
                    signer: deviceSigner,
                },
                mockApiClient as unknown as ApiClient
            );

            // getSigner reports a pending signature op for the device signer
            mockApiClient.getSigner.mockResolvedValue({
                type: "device",
                locator: "device:testkey123",
                publicKey: { x: "1", y: "2" },
                chains: { "base-sepolia": { status: "awaiting-approval", id: "sig-pending-1" } },
            } as any);

            await expect(wallet.recover()).rejects.toThrow(
                "Cannot resume pending approval: no secret available. " +
                    'Call wallet.useSigner({ type: "server", secret: ... }) first with the recovery server secret.'
            );

            // Thrown BEFORE swapping #signer — the device signer under recovery is untouched
            expect(wallet.signer).toBe(deviceSigner);
            expect(mockApiClient.getSignature).not.toHaveBeenCalled();
            expect(mockApiClient.approveSignature).not.toHaveBeenCalled();
        });

        // pins wallet.ts resumePendingDeviceSignerApproval: external-wallet recovery without onSign throws before swapping #signer
        it("throws 'Cannot resume pending approval: no onSign callback available' when resuming with external-wallet recovery lacking onSign", async () => {
            const deviceSigner = createDeviceSignerAdapter("device:testkey123", undefined);
            const wallet = new Wallet(
                {
                    chain: "base-sepolia",
                    address: EVM_ADDRESS,
                    // external-wallet recovery WITHOUT an onSign callback (API-sourced shape)
                    recovery: { type: "external-wallet", address: "0xExternalRecoveryAddress" } as any,
                    signer: deviceSigner,
                },
                mockApiClient as unknown as ApiClient
            );

            mockApiClient.getSigner.mockResolvedValue({
                type: "device",
                locator: "device:testkey123",
                publicKey: { x: "1", y: "2" },
                chains: { "base-sepolia": { status: "awaiting-approval", id: "sig-pending-2" } },
            } as any);

            await expect(wallet.recover()).rejects.toThrow(
                "Cannot resume pending approval: no onSign callback available. " +
                    'Call wallet.useSigner({ type: "external-wallet", address: "0x...", onSign: async (tx) => ... }) first.'
            );

            expect(wallet.signer).toBe(deviceSigner);
            expect(mockApiClient.getSignature).not.toHaveBeenCalled();
        });
    });

    describe("recover() device-signer fallback and guards", () => {
        // pins wallet.ts recover DeviceSignerNotSupportedError catch + assembleRecoverySignerFallback: recovery signer is assembled onto wallet.signer
        it("assembles the recovery signer onto wallet.signer (status 'active') after DEVICE_SIGNER_NOT_SUPPORTED fallback", async () => {
            const mockStorage = createMockDeviceKeyStorage();
            const wallet = new Wallet(
                {
                    chain: "solana",
                    address: SOLANA_ADDRESS,
                    recovery: { type: "api-key" } as any,
                    options: { deviceSignerKeyStorage: mockStorage as any },
                },
                mockApiClient as unknown as ApiClient
            );
            vi.spyOn(wallet, "signers").mockResolvedValue([] as any);
            await wallet.waitForInit();

            // addSigner's upfront getSignerState check — signer not yet registered
            mockApiClient.getSigner.mockResolvedValueOnce({ error: { message: "not found" } } as any);
            // Backend rejects device-signer registration with the stable error code
            mockApiClient.registerSigner.mockResolvedValue({
                error: true,
                message: "Device signers are not currently supported for this Solana wallet.",
                code: "DEVICE_SIGNER_NOT_SUPPORTED",
            } as any);

            await wallet.recover();

            // The recovery signer must be assembled so the consumer's next transaction works
            expect(wallet.signer).toBeDefined();
            expect(wallet.signer?.type).toBe("api-key");
            expect(wallet.signer?.locator()).toBe("api-key");
            // Assembled as admin signer: status "active" hardcoded
            expect(wallet.signer?.status).toBe("active");
            expect(wallet.needsRecovery()).toBe(false);
            expect(mockStorage.deleteKey).toHaveBeenCalledWith(SOLANA_ADDRESS);
            // Only one getSigner call total (addSigner's check) — admin assembly skips getSigner
            expect(mockApiClient.getSigner).toHaveBeenCalledTimes(1);
        });

        // pins wallet.ts recover: needsRecovery=true + missing deviceSignerKeyStorage → exact Error message
        it("throws 'Device signer key storage is required to recover a device signer' when recovery is needed but storage is missing", async () => {
            const mockStorage = createMockDeviceKeyStorage();
            // The wallet holds a reference to this options object and reads
            // deviceSignerKeyStorage lazily inside recover(). Removing the storage after
            // init is the only way to reach this branch without source changes
            // (needsRecovery is only ever set when storage exists at init time).
            const options = { deviceSignerKeyStorage: mockStorage as any };
            const wallet = new Wallet(
                {
                    chain: "base-sepolia",
                    address: EVM_ADDRESS,
                    recovery: { type: "api-key" } as any,
                    options: options as any,
                },
                mockApiClient as unknown as ApiClient
            );
            vi.spyOn(wallet, "signers").mockResolvedValue([] as any);
            await wallet.waitForInit();
            expect(wallet.needsRecovery()).toBe(true);

            (options as any).deviceSignerKeyStorage = undefined;

            const error: Error = await wallet.recover().then(
                () => {
                    throw new Error("expected recover() to reject");
                },
                (e) => e
            );
            expect(error).toBeInstanceOf(Error);
            // Plain Error, not a CrossmintSDKError subclass
            expect(error.constructor).toBe(Error);
            expect(error.message).toBe("Device signer key storage is required to recover a device signer");
        });

        // pins wallet.ts recover: no storage + !needsRecovery → silent return (genuinely reaches the no-storage branch, unlike the api-key-recovery variant)
        it("returns silently when storage is missing and recovery is not needed (non-assemblable recovery, no signer)", async () => {
            // external-wallet recovery without onSign is NOT auto-assemblable, so the init
            // ladder leaves wallet.signer undefined and recover() reaches the storage check.
            const wallet = new Wallet(
                {
                    chain: "base-sepolia",
                    address: EVM_ADDRESS,
                    recovery: { type: "external-wallet", address: "0xExternalRecoveryAddress" } as any,
                },
                mockApiClient as unknown as ApiClient
            );
            await wallet.waitForInit();
            expect(wallet.signer).toBeUndefined();
            expect(wallet.needsRecovery()).toBe(false);

            await expect(wallet.recover()).resolves.toBeUndefined();

            expect(wallet.signer).toBeUndefined();
            expect(mockApiClient.getSigner).not.toHaveBeenCalled();
            expect(mockApiClient.getWallet).not.toHaveBeenCalled();
        });

        // pins wallet.ts recover/findLocalDeviceSigner: mapAddressToKey is deferred until AFTER approval confirmation
        it("does not call mapAddressToKey for a matched local signer that fails the approval check", async () => {
            const mockStorage = createMockDeviceKeyStorage();
            mockStorage.hasKey.mockImplementation(async (key: string) => key === "unapprovedkey");

            const deviceSigners = [
                { type: "device", locator: "device:unapprovedkey", publicKey: { x: "1", y: "2" }, status: "pending" },
            ];

            const wallet = new Wallet(
                {
                    chain: "base-sepolia",
                    address: EVM_ADDRESS,
                    recovery: { type: "api-key" } as any,
                    options: { deviceSignerKeyStorage: mockStorage as any },
                },
                mockApiClient as unknown as ApiClient
            );
            vi.spyOn(wallet, "signers")
                .mockResolvedValueOnce(deviceSigners as any) // recover's findLocalDeviceSigner
                .mockResolvedValue([] as any); // init's resolveDeviceSignerAvailability

            // First getSigner (matched local signer) — not approved, no pending op
            mockApiClient.getSigner.mockResolvedValueOnce({
                type: "device",
                locator: "device:unapprovedkey",
                publicKey: { x: "1", y: "2" },
                chains: { "base-sepolia": { status: "failed" } },
            } as any);
            // Second getSigner (addSigner's check — signer not yet registered)
            mockApiClient.getSigner.mockResolvedValueOnce({ error: { message: "not found" } } as any);
            // Third getSigner (assembleFullSigner after createDeviceSigner)
            mockApiClient.getSigner.mockResolvedValueOnce({
                type: "device",
                locator: "device:mockNewKey",
                publicKey: { x: "0x01", y: "0x02" },
                chains: { "base-sepolia": { status: "success" } },
            } as any);
            mockApiClient.registerSigner.mockResolvedValue({
                type: "device",
                locator: "device:mockNewKey",
                publicKey: { x: "0x01", y: "0x02" },
                chains: { "base-sepolia": { status: "success" } },
            } as any);

            await wallet.recover();

            // Fell through to new-key generation...
            expect(mockApiClient.registerSigner).toHaveBeenCalled();
            expect(wallet.signer?.type).toBe("device");
            // ...WITHOUT poisoning the address→key mapping with the unapproved key
            expect(mockStorage.mapAddressToKey).not.toHaveBeenCalledWith(EVM_ADDRESS, "unapprovedkey");
            expect(mockStorage.mapAddressToKey).not.toHaveBeenCalled();
        });

        // pins wallet.ts recover catch: name-based AuthRejectedError matching (cross-realm duck-typing) keeps the local key and rethrows
        it("treats a plain Error named AuthRejectedError like the class instance: keeps local key and rethrows", async () => {
            const mockStorage = createMockDeviceKeyStorage();
            const wallet = new Wallet(
                {
                    chain: "base-sepolia",
                    address: EVM_ADDRESS,
                    recovery: { type: "api-key" } as any,
                    options: { deviceSignerKeyStorage: mockStorage as any },
                },
                mockApiClient as unknown as ApiClient
            );
            vi.spyOn(wallet, "signers").mockResolvedValue([] as any);

            // Plain Error with the matching name — NOT an instanceof AuthRejectedError
            const crossRealmError = new Error("user dismissed the OTP dialog");
            crossRealmError.name = "AuthRejectedError";
            mockApiClient.registerSigner.mockRejectedValue(crossRealmError);

            await expect(wallet.recover()).rejects.toThrow("user dismissed the OTP dialog");

            // Local key must be preserved so the pending signer can be matched on retry
            expect(mockStorage.deleteKey).not.toHaveBeenCalled();
        });

        // pins wallet.ts recover catch: name-based OtpValidationError matching keeps the local key and rethrows
        it("treats a plain Error named OtpValidationError like the class instance: keeps local key and rethrows", async () => {
            const mockStorage = createMockDeviceKeyStorage();
            const wallet = new Wallet(
                {
                    chain: "base-sepolia",
                    address: EVM_ADDRESS,
                    recovery: { type: "api-key" } as any,
                    options: { deviceSignerKeyStorage: mockStorage as any },
                },
                mockApiClient as unknown as ApiClient
            );
            vi.spyOn(wallet, "signers").mockResolvedValue([] as any);

            const crossRealmError = new Error("OTP verification failed");
            crossRealmError.name = "OtpValidationError";
            mockApiClient.registerSigner.mockRejectedValue(crossRealmError);

            await expect(wallet.recover()).rejects.toThrow("OTP verification failed");

            expect(mockStorage.deleteKey).not.toHaveBeenCalled();
        });
    });

    describe("resolveDeviceSignerAvailability storage guard", () => {
        // pins wallet.ts resolveDeviceSignerAvailability: missing storage throws plain Error (NOT signers/index.ts's WalletCreationError twin)
        it("useSigner with device config throws 'Device signer key storage is required for device signers' when storage is missing", async () => {
            const wallet = new Wallet(
                {
                    chain: "base-sepolia",
                    address: EVM_ADDRESS,
                    recovery: { type: "api-key" } as any,
                    // no options.deviceSignerKeyStorage
                },
                mockApiClient as unknown as ApiClient
            );
            await wallet.waitForInit();

            const error: Error = await wallet.useSigner({ type: "device" } as any).then(
                () => {
                    throw new Error("expected useSigner to reject");
                },
                (e) => e
            );

            expect(error).toBeInstanceOf(Error);
            // The wallet.ts guard throws a plain Error — distinct from the same-text
            // WalletCreationError thrown by assembleSigner in signers/index.ts
            expect(error.constructor).toBe(Error);
            expect(error).not.toBeInstanceOf(WalletCreationError);
            expect(error.message).toBe("Device signer key storage is required for device signers");
        });
    });
});
