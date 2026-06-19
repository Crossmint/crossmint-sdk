import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Chain } from "../../chains/chains";
import { walletsLogger } from "../../logger";
import { assembleSigner } from "../../signers";
import { AuthRejectedError, OtpValidationError, type SignerAdapter } from "../../signers/types";
import { createDeviceSigner } from "@/utils/device-signers";
import { DeviceSignerNotSupportedError } from "../../utils/errors";
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
        ...overrides,
    };
}

type SetupOverrides = {
    storage?: ReturnType<typeof makeStorage> | null;
    signerManager?: Record<string, unknown>;
    hasRecoveryResolution?: boolean;
    signers?: ReturnType<typeof vi.fn>;
    addSigner?: ReturnType<typeof vi.fn>;
    approveSignature?: ReturnType<typeof vi.fn>;
    approveTransaction?: ReturnType<typeof vi.fn>;
};

function setup(overrides: SetupOverrides = {}) {
    const storage = overrides.storage === null ? undefined : overrides.storage ?? makeStorage();
    const options = storage == null ? undefined : ({ deviceSignerKeyStorage: storage } as Record<string, unknown>);
    const signerManager = makeSignerManager(overrides.signerManager);
    const serverSignerResolver = { hasRecoveryResolution: overrides.hasRecoveryResolution ?? false };
    const signers = overrides.signers ?? vi.fn().mockResolvedValue([]);
    const addSigner = overrides.addSigner ?? vi.fn().mockResolvedValue(undefined);
    const approveSignature = overrides.approveSignature ?? vi.fn().mockResolvedValue(undefined);
    const approveTransaction = overrides.approveTransaction ?? vi.fn().mockResolvedValue(undefined);
    const service = new DeviceRecoveryService({
        chain: "base-sepolia",
        walletAddress: WALLET_ADDRESS,
        options,
        signerManager,
        serverSignerResolver,
        signers,
        addSigner,
        approveSignature,
        approveTransaction,
    } as unknown as DeviceRecoveryServiceParams<Chain>);
    return { service, storage, options, signerManager, signers, addSigner, approveSignature, approveTransaction };
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
        ])("keeps the local key and rethrows for %s", async (_name, error) => {
            const addSigner = vi.fn().mockRejectedValue(error);
            const { service, storage } = setup({ addSigner });
            await expect(service.recover()).rejects.toBe(error);
            expect(storage?.deleteKey).not.toHaveBeenCalled();
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
