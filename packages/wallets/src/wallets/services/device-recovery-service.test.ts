import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Chain } from "../../chains/chains";
import { walletsLogger } from "../../logger";
import { assembleSigner } from "../../signers";
import {
    AuthRejectedError,
    OtpValidationError,
    SignerAuthenticationError,
    type SignerAdapter,
} from "../../signers/types";
import { createDeviceSigner } from "@/utils/device-signers";
import { DeviceSignerNotSupportedError, SignerLimitExceededError } from "../../utils/errors";
import { DeviceRecoveryService, type DeviceRecoveryServiceParams } from "./device-recovery-service";

vi.mock("../../signers", async (importOriginal) => {
    const actual = await importOriginal<typeof import("../../signers")>();
    return { ...actual, assembleSigner: vi.fn() };
});
vi.mock("@/utils/device-signers", async (importOriginal) => {
    const actual = await importOriginal<typeof import("@/utils/device-signers")>();
    return { ...actual, createDeviceSigner: vi.fn() };
});

const mockedAssembleSigner = vi.mocked(assembleSigner);
const mockedCreateDeviceSigner = vi.mocked(createDeviceSigner);

const WALLET_ADDRESS = "0x1234567890123456789012345678901234567890";
const NULL_STATE = { response: null, signer: null, pendingOperation: null };

function makeSigner(type: string, locatorValue: string, status?: string): SignerAdapter {
    return { type, status, locator: () => locatorValue } as unknown as SignerAdapter;
}

function pendingState(operationType: "signature" | "transaction", id: string) {
    return { response: {}, signer: { status: "awaiting-approval" }, pendingOperation: { type: operationType, id } };
}

function makeSignerManager(overrides: Record<string, unknown> = {}) {
    let active = overrides.activeSigner as SignerAdapter | undefined;
    return {
        get activeSigner() {
            return active;
        },
        setActiveSigner: vi.fn((signer: SignerAdapter | undefined) => {
            active = signer;
        }),
        recovery: overrides.recovery ?? { type: "api-key" },
        descriptorContext: vi.fn(() => ({ walletAddress: WALLET_ADDRESS })),
        isApprovedSignerStatus: (status: unknown) => status === "success" || status === "active",
        getSignerState: overrides.getSignerState ?? vi.fn().mockResolvedValue(NULL_STATE),
        assemble: overrides.assemble ?? vi.fn().mockResolvedValue(makeSigner("device", "device:assembled", "success")),
    };
}

function makeStorage(overrides: Record<string, unknown> = {}) {
    return {
        getKey: vi.fn().mockResolvedValue(null),
        hasKey: vi.fn().mockResolvedValue(false),
        mapAddressToKey: vi.fn().mockResolvedValue(undefined),
        deleteKey: vi.fn().mockResolvedValue(undefined),
        getDeviceName: vi.fn().mockReturnValue("This Device"),
        saveSignerLocator: vi.fn().mockResolvedValue(undefined),
        getSavedSignerLocator: vi.fn().mockResolvedValue(null),
        ...overrides,
    };
}

type SetupOverrides = {
    storage?: ReturnType<typeof makeStorage> | null;
    signerManager?: Record<string, unknown>;
    hasRecoveryResolution?: boolean;
    signers?: ReturnType<typeof vi.fn>;
    addSigner?: ReturnType<typeof vi.fn>;
    removeSigner?: ReturnType<typeof vi.fn>;
    approveSignature?: ReturnType<typeof vi.fn>;
    approveTransaction?: ReturnType<typeof vi.fn>;
    deviceSignerActivity?: ReturnType<typeof vi.fn>;
};

function setup(overrides: SetupOverrides = {}) {
    const storage = overrides.storage === null ? undefined : overrides.storage ?? makeStorage();
    const options = storage == null ? undefined : ({ deviceSignerKeyStorage: storage } as Record<string, unknown>);
    const signerManager = makeSignerManager(overrides.signerManager);
    const serverSignerResolver = {
        hasRecoveryResolutionFor: (_address: string) => overrides.hasRecoveryResolution ?? false,
    };
    const signers = overrides.signers ?? vi.fn().mockResolvedValue([]);
    const addSigner = overrides.addSigner ?? vi.fn().mockResolvedValue(undefined);
    const removeSigner = overrides.removeSigner ?? vi.fn().mockResolvedValue(undefined);
    const approveSignature = overrides.approveSignature ?? vi.fn().mockResolvedValue(undefined);
    const approveTransaction = overrides.approveTransaction ?? vi.fn().mockResolvedValue(undefined);
    const deviceSignerActivity = overrides.deviceSignerActivity ?? vi.fn().mockResolvedValue(new Map());
    const service = new DeviceRecoveryService({
        chain: "base-sepolia",
        walletAddress: WALLET_ADDRESS,
        options,
        signerManager,
        serverSignerResolver,
        signers,
        addSigner,
        removeSigner,
        approveSignature,
        approveTransaction,
        deviceSignerActivity,
    } as unknown as DeviceRecoveryServiceParams<Chain>);
    return {
        service,
        storage,
        options,
        signerManager,
        signers,
        addSigner,
        removeSigner,
        approveSignature,
        approveTransaction,
    };
}

beforeEach(() => {
    vi.clearAllMocks();
    mockedCreateDeviceSigner.mockResolvedValue({
        type: "device",
        locator: "device:newkey",
        publicKey: { x: "0x01", y: "0x02" },
        name: "Test Device",
    } as never);
    mockedAssembleSigner.mockReturnValue(makeSigner("device", "device:recovery"));
});

describe("DeviceRecoveryService", () => {
    describe("recovery-need state", () => {
        it("needsRecovery is false before anything resolves", () => {
            expect(setup().service.needsRecovery).toBe(false);
        });

        it("resolveAvailability flags recovery when no local key matches any registered device signer", async () => {
            const { service } = setup();
            await service.resolveAvailability({ type: "device" } as never);
            expect(service.needsRecovery).toBe(true);
        });

        it("onSignerSelected clears a pending recovery need", async () => {
            const { service } = setup();
            await service.resolveAvailability({ type: "device" } as never);
            expect(service.needsRecovery).toBe(true);
            service.onSignerSelected();
            expect(service.needsRecovery).toBe(false);
        });

        it("onSignerSelected does not re-trigger recovery on an already-resolved wallet", async () => {
            const { service } = setup();
            await service.recover();
            service.onSignerSelected();
            await service.recover();
            expect(mockedCreateDeviceSigner).toHaveBeenCalledTimes(1);
        });
    });

    describe("resolveAvailability", () => {
        it("throws when device key storage is missing", async () => {
            const { service } = setup({ storage: null });
            await expect(service.resolveAvailability({ type: "device" } as never)).rejects.toThrow(
                /key storage is required for device signers/
            );
        });

        it("uses an existing local key without flagging recovery", async () => {
            const storage = makeStorage({ getKey: vi.fn().mockResolvedValue("existingKey") });
            const { service } = setup({ storage });
            const config = { type: "device" } as { type: "device"; locator?: string };
            await service.resolveAvailability(config as never);
            expect(config.locator).toBe("device:existingKey");
            expect(service.needsRecovery).toBe(false);
        });

        it("maps a registered device signer whose key is present locally", async () => {
            const storage = makeStorage({ hasKey: vi.fn().mockResolvedValue(true) });
            const signers = vi.fn().mockResolvedValue([{ locator: "device:registeredKey" }]);
            const { service } = setup({ storage, signers });
            const config = { type: "device" } as { type: "device"; locator?: string };
            await service.resolveAvailability(config as never);
            expect(storage.mapAddressToKey).toHaveBeenCalledWith(WALLET_ADDRESS, "registeredKey");
            expect(config.locator).toBe("device:registeredKey");
            expect(service.needsRecovery).toBe(false);
        });

        it.each([
            ["the wallet address maps to a local key", { getKey: vi.fn().mockResolvedValue("localKey") }],
            ["a registered signer's key is on this device", { hasKey: vi.fn().mockResolvedValue(true) }],
        ])("saves this device's signer locator when %s", async (_name, storageOverrides) => {
            const signers = vi.fn().mockResolvedValue([{ type: "device", locator: "device:localKey" }]);
            const storage = makeStorage(storageOverrides);
            const { service } = setup({ storage, signers });
            await service.resolveAvailability({ type: "device" } as never);
            expect(storage.saveSignerLocator).toHaveBeenCalledWith(WALLET_ADDRESS, "device:localKey");
        });

        it("clears a stale recovery need once a local key is adopted (WAL-10668)", async () => {
            const storage = makeStorage();
            const { service } = setup({ storage });
            await service.resolveAvailability({ type: "device" } as never);
            expect(service.needsRecovery).toBe(true);

            storage.getKey.mockResolvedValue("adoptedKey");
            await service.resolveAvailability({ type: "device" } as never);
            expect(service.needsRecovery).toBe(false);
        });
    });

    describe("recover() guards", () => {
        it("fast-paths without touching the backend once already resolved", async () => {
            const { service, addSigner } = setup();
            await service.recover();
            await service.recover();
            expect(addSigner).toHaveBeenCalledTimes(1);
            expect(mockedCreateDeviceSigner).toHaveBeenCalledTimes(1);
        });

        it("skips recovery and clears the need when a non-device signer is active", async () => {
            const { service, addSigner } = setup({ signerManager: { activeSigner: makeSigner("api-key", "api-key") } });
            await service.resolveAvailability({ type: "device" } as never);
            await service.recover();
            expect(service.needsRecovery).toBe(false);
            expect(addSigner).not.toHaveBeenCalled();
        });

        it("returns silently when storage is missing and recovery is not needed", async () => {
            const { service, signers } = setup({ storage: null });
            await expect(service.recover()).resolves.toBeUndefined();
            expect(signers).not.toHaveBeenCalled();
        });

        it("throws when recovery is needed but storage has gone missing", async () => {
            const { service, options } = setup();
            await service.resolveAvailability({ type: "device" } as never);
            expect(service.needsRecovery).toBe(true);
            (options as Record<string, unknown>).deviceSignerKeyStorage = undefined;
            await expect(service.recover()).rejects.toThrow(/key storage is required to recover/);
        });
    });

    describe("recover() new-device registration", () => {
        it("falls back to the recovery signer when the provider rejects device signers", async () => {
            const addSigner = vi.fn().mockRejectedValue(new DeviceSignerNotSupportedError("unsupported"));
            const { service, storage, signerManager } = setup({ addSigner });
            await service.recover();
            expect(storage?.deleteKey).toHaveBeenCalledWith(WALLET_ADDRESS);
            expect(signerManager.setActiveSigner).toHaveBeenCalled();
            expect(service.needsRecovery).toBe(false);
            await service.recover();
            expect(addSigner).toHaveBeenCalledTimes(1);
        });

        it("swallows an already-approved error and reassembles the device signer", async () => {
            const addSigner = vi.fn().mockRejectedValue(new Error("Delegated signer is already approved"));
            const { service, storage, signerManager } = setup({ addSigner });
            await expect(service.recover()).resolves.toBeUndefined();
            expect(storage?.deleteKey).not.toHaveBeenCalled();
            expect(signerManager.assemble).toHaveBeenCalled();
            expect(signerManager.setActiveSigner).toHaveBeenCalled();
        });

        it("deletes the key and rethrows on an unrecognized registration error", async () => {
            const addSigner = vi.fn().mockRejectedValue(new Error("boom"));
            const { service, storage } = setup({ addSigner });
            await expect(service.recover()).rejects.toThrow(/boom/);
            expect(storage?.deleteKey).toHaveBeenCalledWith(WALLET_ADDRESS);
        });

        it.each([
            ["AuthRejectedError instance", new AuthRejectedError("auth")],
            ["a plain Error named AuthRejectedError", Object.assign(new Error("auth"), { name: "AuthRejectedError" })],
            ["OtpValidationError instance", new OtpValidationError("otp", "INVALID_OTP" as never)],
            ["a plain Error named OtpValidationError", Object.assign(new Error("otp"), { name: "OtpValidationError" })],
            ["SignerAuthenticationError instance", new SignerAuthenticationError("jwt", "jwt-required")],
            [
                "a plain Error named SignerAuthenticationError",
                Object.assign(new Error("jwt"), { name: "SignerAuthenticationError" }),
            ],
        ])("keeps the local key and rethrows for %s", async (_name, error) => {
            const addSigner = vi.fn().mockRejectedValue(error);
            const { service, storage } = setup({ addSigner });
            await expect(service.recover()).rejects.toBe(error);
            expect(storage?.deleteKey).not.toHaveBeenCalled();
        });

        it("removes this device's saved signer after registering its replacement", async () => {
            const signers = vi.fn().mockResolvedValue([
                { type: "device", locator: "device:oldkey" },
                { type: "device", locator: "device:otherDeviceKey" },
            ]);
            const storage = makeStorage({ getSavedSignerLocator: vi.fn().mockResolvedValue("device:oldkey") });
            const removeSigner = vi.fn().mockResolvedValue(undefined);
            const { service } = setup({ storage, signers, removeSigner });
            await service.recover();
            expect(removeSigner).toHaveBeenCalledTimes(1);
            expect(removeSigner).toHaveBeenCalledWith("device:oldkey");
            expect(storage.saveSignerLocator).toHaveBeenCalledWith(WALLET_ADDRESS, "device:newkey");
        });

        it("does not fail recovery when removing the saved signer fails", async () => {
            const signers = vi.fn().mockResolvedValue([{ type: "device", locator: "device:oldkey" }]);
            const storage = makeStorage({ getSavedSignerLocator: vi.fn().mockResolvedValue("device:oldkey") });
            const removeSigner = vi.fn().mockRejectedValue(new Error("backend unavailable"));
            const { service } = setup({ storage, signers, removeSigner });
            await expect(service.recover()).resolves.toBeUndefined();
            expect(removeSigner).toHaveBeenCalledWith("device:oldkey");
        });

        it.each([
            ["no locator is saved", null],
            ["the saved locator is no longer on the wallet", "device:alreadyRemovedKey"],
        ])("leaves another device's signer alone when %s", async (_name, savedLocator) => {
            const signers = vi.fn().mockResolvedValue([{ type: "device", locator: "device:otherDeviceKey" }]);
            const storage = makeStorage({ getSavedSignerLocator: vi.fn().mockResolvedValue(savedLocator) });
            const removeSigner = vi.fn();
            const { service } = setup({ storage, signers, removeSigner });
            await service.recover();
            expect(removeSigner).not.toHaveBeenCalled();
        });
    });

    describe("recover() when the wallet is at its signer limit", () => {
        const DEVICE_SIGNERS = [
            { type: "device", locator: "device:recentKey" },
            { type: "device", locator: "device:idleKey" },
            { type: "device", locator: "device:neverUsedKey" },
        ];
        const ACTIVITY = new Map([
            ["device:recentKey", Date.parse("2026-10-20T00:00:00Z")],
            ["device:idleKey", Date.parse("2026-08-01T00:00:00Z")],
            ["device:neverUsedKey", Date.parse("2026-09-01T00:00:00Z")],
        ]);

        function limitThenSuccess() {
            return vi
                .fn()
                .mockRejectedValueOnce(new SignerLimitExceededError("limit"))
                .mockResolvedValueOnce(undefined);
        }

        it("removes the least recently active device signer and registers the new one", async () => {
            const addSigner = limitThenSuccess();
            const removeSigner = vi.fn().mockResolvedValue(undefined);
            const deviceSignerActivity = vi.fn().mockResolvedValue(ACTIVITY);
            const signers = vi.fn().mockResolvedValue(DEVICE_SIGNERS);
            const { service } = setup({ signers, addSigner, removeSigner, deviceSignerActivity });
            await service.recover();
            expect(removeSigner).toHaveBeenCalledTimes(1);
            expect(removeSigner).toHaveBeenCalledWith("device:idleKey");
            expect(addSigner).toHaveBeenCalledTimes(2);
            expect(service.needsRecovery).toBe(false);
        });

        it("removes the saved signer instead of the least recently active one", async () => {
            const addSigner = limitThenSuccess();
            const removeSigner = vi.fn().mockResolvedValue(undefined);
            const deviceSignerActivity = vi.fn().mockResolvedValue(ACTIVITY);
            const signers = vi.fn().mockResolvedValue(DEVICE_SIGNERS);
            const storage = makeStorage({ getSavedSignerLocator: vi.fn().mockResolvedValue("device:recentKey") });
            const { service } = setup({ storage, signers, addSigner, removeSigner, deviceSignerActivity });
            await service.recover();
            expect(removeSigner).toHaveBeenCalledTimes(1);
            expect(removeSigner).toHaveBeenCalledWith("device:recentKey");
        });

        it("does not remove the device signer that is being registered", async () => {
            mockedCreateDeviceSigner.mockResolvedValue({
                type: "device",
                locator: "device:idleKey",
                publicKey: { x: "0x01", y: "0x02" },
            } as never);
            const addSigner = limitThenSuccess();
            const removeSigner = vi.fn().mockResolvedValue(undefined);
            const deviceSignerActivity = vi.fn().mockResolvedValue(ACTIVITY);
            const signers = vi.fn().mockResolvedValue(DEVICE_SIGNERS);
            const { service } = setup({ signers, addSigner, removeSigner, deviceSignerActivity });
            await service.recover();
            expect(removeSigner).toHaveBeenCalledWith("device:neverUsedKey");
        });

        it.each([
            ["the wallet has no other device signer", [], vi.fn().mockResolvedValue(new Map())],
            ["the signer activity cannot be fetched", DEVICE_SIGNERS, vi.fn().mockRejectedValue(new Error("down"))],
        ])("throws the limit error when %s", async (_name, existing, deviceSignerActivity) => {
            const addSigner = vi.fn().mockRejectedValue(new SignerLimitExceededError("limit"));
            const removeSigner = vi.fn();
            const signers = vi.fn().mockResolvedValue(existing);
            const { service } = setup({ signers, addSigner, removeSigner, deviceSignerActivity });
            await expect(service.recover()).rejects.toBeInstanceOf(SignerLimitExceededError);
            expect(removeSigner).not.toHaveBeenCalled();
        });
    });

    describe("recover() resume guards", () => {
        it.each([
            ["server recovery with no resolved secret", { type: "server", address: "0xServer" }, /no secret available/],
            [
                "external-wallet recovery without an onSign callback",
                { type: "external-wallet", address: "0xExt" },
                /no onSign callback available/,
            ],
        ])("throws before swapping the signer for %s", async (_name, recovery, expected) => {
            const activeSigner = makeSigner("device", "device:active");
            const { service, signerManager } = setup({
                signerManager: {
                    activeSigner,
                    recovery,
                    getSignerState: vi.fn().mockResolvedValue(pendingState("signature", "sig-1")),
                },
            });
            await expect(service.recover()).rejects.toThrow(expected);
            expect(signerManager.setActiveSigner).not.toHaveBeenCalled();
        });
    });

    describe("initDeviceSigner", () => {
        it("is a no-op when no device key storage is configured", async () => {
            const { service, signers } = setup({ storage: null });
            await service.initDeviceSigner();
            expect(service.needsRecovery).toBe(false);
            expect(signers).not.toHaveBeenCalled();
        });

        it("does not retry once the provider is known to reject device signers", async () => {
            const addSigner = vi.fn().mockRejectedValue(new DeviceSignerNotSupportedError("unsupported"));
            const { service, storage } = setup({ addSigner });
            await service.recover();
            storage?.getKey.mockClear();
            await service.initDeviceSigner();
            expect(storage?.getKey).not.toHaveBeenCalled();
        });

        it("flags recovery and logs when availability resolution throws", async () => {
            const storage = makeStorage({ getKey: vi.fn().mockRejectedValue(new Error("storage blocked")) });
            const { service } = setup({ storage });
            await service.initDeviceSigner();
            expect(service.needsRecovery).toBe(true);
            expect(walletsLogger.error).toHaveBeenCalledWith(
                "wallet.initDeviceSigner.error",
                expect.objectContaining({ error: expect.any(Error) })
            );
        });

        it("flags recovery when the assembled device signer is not yet approved", async () => {
            const storage = makeStorage({ getKey: vi.fn().mockResolvedValue("localKey") });
            const signerManager = { assemble: vi.fn().mockResolvedValue(makeSigner("device", "device:localKey")) };
            const { service } = setup({ storage, signerManager });
            await service.initDeviceSigner();
            expect(service.needsRecovery).toBe(true);
        });

        it("assembles and activates an approved device signer without flagging recovery", async () => {
            const storage = makeStorage({ getKey: vi.fn().mockResolvedValue("localKey") });
            const signerManager = {
                assemble: vi.fn().mockResolvedValue(makeSigner("device", "device:localKey", "success")),
            };
            const { service, signerManager: sm } = setup({ storage, signerManager });
            await service.initDeviceSigner();
            expect(sm.setActiveSigner).toHaveBeenCalled();
            expect(service.needsRecovery).toBe(false);
        });
    });
});
