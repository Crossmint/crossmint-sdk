import { requireNativeModule } from "expo-modules-core";
import { beforeEach, describe, expect, test, vi } from "vitest";

const { nativeModule } = vi.hoisted(() => ({
    nativeModule: {
        isAvailable: vi.fn(),
        generateKey: vi.fn(),
        mapAddressToKey: vi.fn(),
        getKey: vi.fn(),
        hasKey: vi.fn(),
        signMessage: vi.fn(),
        deleteKey: vi.fn(),
        deletePendingKey: vi.fn(),
    },
}));

vi.mock("expo-modules-core", () => ({ requireNativeModule: vi.fn(() => nativeModule) }));

vi.mock("expo-device", () => ({ deviceName: "Pixel 9", modelName: null, brand: null, osName: "Android" }));

// Only the abstract base class is needed; the real package is slow to import once per test.
vi.mock("@crossmint/wallets-sdk", () => ({
    DeviceSignerKeyStorage: class {
        constructor(protected readonly apiKey: string) {}
    },
}));

const ADDRESS = "0x1234567890abcdef1234567890abcdef12345678";
const PUBLIC_KEY = "BPublicKeyBase64==";

// The module caches the native module in a module-level variable, so each test loads a fresh copy.
async function loadStorage() {
    vi.resetModules();
    const { NativeDeviceSignerKeyStorage } = await import("./NativeDeviceSignerKeyStorage");
    return new NativeDeviceSignerKeyStorage();
}

describe("NativeDeviceSignerKeyStorage", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.mocked(requireNativeModule).mockImplementation(() => nativeModule as never);
    });

    test("loads the CrossmintDeviceSigner native module", async () => {
        const storage = await loadStorage();
        nativeModule.getKey.mockResolvedValue(PUBLIC_KEY);

        await storage.getKey(ADDRESS);

        expect(requireNativeModule).toHaveBeenCalledWith("CrossmintDeviceSigner");
    });

    describe("when generateKey has no address", () => {
        test("passes null to the native module", async () => {
            const storage = await loadStorage();
            nativeModule.generateKey.mockResolvedValue(PUBLIC_KEY);

            expect(await storage.generateKey({})).toBe(PUBLIC_KEY);
            expect(nativeModule.generateKey).toHaveBeenCalledWith(null);
        });
    });

    const SIGNATURE = { r: `0x${"1".repeat(64)}`, s: `0x${"2".repeat(64)}` };

    test.each([
        {
            method: "generateKey",
            call: (s: any) => s.generateKey({ address: ADDRESS }),
            args: [ADDRESS],
            result: PUBLIC_KEY,
        },
        {
            method: "mapAddressToKey",
            call: (s: any) => s.mapAddressToKey(ADDRESS, PUBLIC_KEY),
            args: [ADDRESS, PUBLIC_KEY],
            result: undefined,
        },
        { method: "getKey", call: (s: any) => s.getKey(ADDRESS), args: [ADDRESS], result: PUBLIC_KEY },
        { method: "hasKey", call: (s: any) => s.hasKey(PUBLIC_KEY), args: [PUBLIC_KEY], result: true },
        {
            method: "signMessage",
            call: (s: any) => s.signMessage(ADDRESS, "aGVsbG8="),
            args: [ADDRESS, "aGVsbG8="],
            result: SIGNATURE,
        },
        { method: "deleteKey", call: (s: any) => s.deleteKey(ADDRESS), args: [ADDRESS], result: undefined },
        {
            method: "deletePendingKey",
            call: (s: any) => s.deletePendingKey(PUBLIC_KEY),
            args: [PUBLIC_KEY],
            result: undefined,
        },
    ] as const)(
        "forwards $method to the native module and returns its result",
        async ({ method, call, args, result }) => {
            const storage = await loadStorage();
            nativeModule[method].mockResolvedValue(result);

            expect(await call(storage)).toEqual(result);
            expect(nativeModule[method]).toHaveBeenCalledWith(...args);
        }
    );

    describe("when no key is mapped to the address", () => {
        test("getKey returns null", async () => {
            const storage = await loadStorage();
            nativeModule.getKey.mockResolvedValue(null);

            expect(await storage.getKey(ADDRESS)).toBeNull();
        });
    });

    describe("when the native module is missing", () => {
        test("throws an error that points to a development build", async () => {
            vi.mocked(requireNativeModule).mockImplementation(() => {
                throw new Error("Cannot find native module 'CrossmintDeviceSigner'");
            });
            const storage = await loadStorage();

            expect(() => storage.getKey(ADDRESS)).toThrow("CrossmintDeviceSigner native module is not available");
        });
    });

    test("combines the device name and the OS", async () => {
        const storage = await loadStorage();

        expect(storage.getDeviceName()).toBe("Pixel 9 (Android)");
    });
});
