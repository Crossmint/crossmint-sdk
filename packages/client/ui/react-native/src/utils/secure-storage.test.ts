import * as SecureStore from "expo-secure-store";
import { beforeEach, describe, expect, test, vi } from "vitest";

import { SecureStorage } from "./SecureStorage";

const { store } = vi.hoisted(() => ({ store: new Map<string, string>() }));

vi.mock("expo-secure-store", () => ({
    getItemAsync: vi.fn(async (key: string) => store.get(key) ?? null),
    setItemAsync: vi.fn(async (key: string, value: string) => {
        store.set(key, value);
    }),
    deleteItemAsync: vi.fn(async (key: string) => {
        store.delete(key);
    }),
    isAvailableAsync: vi.fn(async () => true),
}));

const KEY = "crossmint-jwt";
const PAST = "2000-01-01T00:00:00.000Z";
const FUTURE = "2999-01-01T00:00:00.000Z";

describe("SecureStorage", () => {
    let storage: SecureStorage;

    beforeEach(() => {
        store.clear();
        vi.clearAllMocks();
        vi.spyOn(console, "error").mockImplementation(() => {});
        storage = new SecureStorage();
    });

    describe("when a value is stored without an expiry", () => {
        test("returns the raw value", async () => {
            await storage.set(KEY, "token");

            expect(store.get(KEY)).toBe("token");
            expect(await storage.get(KEY)).toBe("token");
        });
    });

    describe("when a value is stored with a future expiry", () => {
        test("returns the value", async () => {
            await storage.set(KEY, "token", FUTURE);

            expect(JSON.parse(store.get(KEY) ?? "")).toEqual({ value: "token", expiresAt: FUTURE });
            expect(await storage.get(KEY)).toBe("token");
        });
    });

    describe("when a stored value has expired", () => {
        test("returns undefined and deletes the value", async () => {
            await storage.set(KEY, "token", PAST);

            expect(await storage.get(KEY)).toBeUndefined();
            expect(store.has(KEY)).toBe(false);
        });
    });

    describe("when no value is stored", () => {
        test("returns undefined", async () => {
            expect(await storage.get(KEY)).toBeUndefined();
        });
    });

    describe("when a value is removed", () => {
        test("deletes it from SecureStore", async () => {
            await storage.set(KEY, "token");
            await storage.remove(KEY);

            expect(store.has(KEY)).toBe(false);
        });
    });

    describe("when SecureStore throws", () => {
        test("get returns undefined", async () => {
            vi.mocked(SecureStore.getItemAsync).mockRejectedValueOnce(new Error("keychain locked"));

            expect(await storage.get(KEY)).toBeUndefined();
        });

        test("set does not throw", async () => {
            vi.mocked(SecureStore.setItemAsync).mockRejectedValueOnce(new Error("keychain locked"));

            await expect(storage.set(KEY, "token")).resolves.toBeUndefined();
        });

        test("remove does not throw", async () => {
            vi.mocked(SecureStore.deleteItemAsync).mockRejectedValueOnce(new Error("keychain locked"));

            await expect(storage.remove(KEY)).resolves.toBeUndefined();
        });

        test("isAvailable returns false", async () => {
            vi.mocked(SecureStore.isAvailableAsync).mockRejectedValueOnce(new Error("unavailable"));

            expect(await storage.isAvailable()).toBe(false);
        });
    });

    describe("when SecureStore is available", () => {
        test("isAvailable returns true", async () => {
            expect(await storage.isAvailable()).toBe(true);
        });
    });
});
