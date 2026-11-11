import { p256 } from "@noble/curves/p256";
import { beforeEach, describe, expect, test, vi } from "vitest";

import { SoftwareDeviceSignerKeyStorage } from "./SoftwareDeviceSignerKeyStorage";

const { store, device } = vi.hoisted(() => ({
    store: new Map<string, string>(),
    device: {
        deviceName: "Test iPhone" as string | null,
        modelName: "iPhone 16" as string | null,
        brand: "Apple" as string | null,
        osName: "iOS" as string | null,
    },
}));

vi.mock("expo-secure-store", () => ({
    getItemAsync: vi.fn(async (key: string) => store.get(key) ?? null),
    setItemAsync: vi.fn(async (key: string, value: string) => {
        store.set(key, value);
    }),
    deleteItemAsync: vi.fn(async (key: string) => {
        store.delete(key);
    }),
}));

vi.mock("expo-device", () => device);

const ADDRESS = "0x1234567890abcdef1234567890abcdef12345678";
// base64 of "hello"
const MESSAGE = "aGVsbG8=";

function base64ToBytes(base64: string): Uint8Array {
    return Uint8Array.from(atob(base64), (char) => char.charCodeAt(0));
}

describe("SoftwareDeviceSignerKeyStorage", () => {
    let storage: SoftwareDeviceSignerKeyStorage;

    beforeEach(() => {
        store.clear();
        storage = new SoftwareDeviceSignerKeyStorage();
    });

    describe("when a key is generated for an address", () => {
        test("returns an uncompressed P-256 public key", async () => {
            const publicKey = await storage.generateKey({ address: ADDRESS });
            const bytes = base64ToBytes(publicKey);

            expect(bytes).toHaveLength(65);
            expect(bytes[0]).toBe(0x04);
        });

        test("maps the address to the public key", async () => {
            const publicKey = await storage.generateKey({ address: ADDRESS });

            expect(await storage.getKey(ADDRESS)).toBe(publicKey);
            expect(await storage.hasKey(publicKey)).toBe(true);
        });

        test("signs a message that verifies against the public key", async () => {
            const publicKey = await storage.generateKey({ address: ADDRESS });

            const { r, s } = await storage.signMessage(ADDRESS, MESSAGE);
            const signature = new p256.Signature(BigInt(r), BigInt(s));

            expect(r).toMatch(/^0x[0-9a-f]{64}$/);
            expect(s).toMatch(/^0x[0-9a-f]{64}$/);
            expect(p256.verify(signature, base64ToBytes(MESSAGE), base64ToBytes(publicKey), { prehash: true })).toBe(
                true
            );
        });
    });

    describe("when a key is generated without an address", () => {
        test("keeps it pending until it is mapped", async () => {
            const publicKey = await storage.generateKey({});

            expect(await storage.getKey(ADDRESS)).toBeNull();
            expect(await storage.hasKey(publicKey)).toBe(true);

            await storage.mapAddressToKey(ADDRESS, publicKey);

            expect(await storage.getKey(ADDRESS)).toBe(publicKey);
            await expect(storage.signMessage(ADDRESS, MESSAGE)).resolves.toHaveProperty("r");
        });

        test("forgets it after deletePendingKey", async () => {
            const publicKey = await storage.generateKey({});

            await storage.deletePendingKey(publicKey);

            expect(await storage.hasKey(publicKey)).toBe(false);
            await expect(storage.mapAddressToKey(ADDRESS, publicKey)).rejects.toThrow("No pending key found");
        });
    });

    describe("when a key is deleted", () => {
        test("removes the address mapping and the public key", async () => {
            const publicKey = await storage.generateKey({ address: ADDRESS });

            await storage.deleteKey(ADDRESS);

            expect(await storage.getKey(ADDRESS)).toBeNull();
            expect(await storage.hasKey(publicKey)).toBe(false);
            await expect(storage.signMessage(ADDRESS, MESSAGE)).rejects.toThrow("No key found for address");
        });
    });

    describe("when a new instance reads existing storage", () => {
        test("finds keys created by an earlier instance", async () => {
            const publicKey = await storage.generateKey({ address: ADDRESS });

            const reloaded = new SoftwareDeviceSignerKeyStorage();

            expect(await reloaded.hasKey(publicKey)).toBe(true);
            expect(await reloaded.getKey(ADDRESS)).toBe(publicKey);
        });
    });

    describe("getDeviceName", () => {
        test("combines the device name and the OS", () => {
            expect(storage.getDeviceName()).toBe("Test iPhone (iOS)");
        });

        describe("when the device reports no name or OS", () => {
            test("returns Unknown Device", () => {
                const original = { ...device };
                Object.assign(device, { deviceName: null, modelName: null, brand: null, osName: null });
                try {
                    expect(storage.getDeviceName()).toBe("Unknown Device");
                } finally {
                    Object.assign(device, original);
                }
            });
        });
    });
});
