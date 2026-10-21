import "fake-indexeddb/auto";
import { IDBFactory } from "fake-indexeddb";
import { beforeEach, describe, expect, it } from "vitest";
import { decodeBase64 } from "@crossmint/client-signers-cryptography";
import { IndexedDbDeviceSignerKeyStorage } from "./IndexedDbDeviceSignerKeyStorage";

const API_KEY = "ck_staging_test";
const ADDRESS = "0x1111111111111111111111111111111111111111";

async function verifies(publicKeyBase64: string, message: Uint8Array, sig: { r: string; s: string }) {
    const publicKey = await crypto.subtle.importKey(
        "raw",
        decodeBase64(publicKeyBase64),
        { name: "ECDSA", namedCurve: "P-256" },
        false,
        ["verify"]
    );
    const signature = Buffer.concat([Buffer.from(sig.r.slice(2), "hex"), Buffer.from(sig.s.slice(2), "hex")]);
    return crypto.subtle.verify({ name: "ECDSA", hash: { name: "SHA-256" } }, publicKey, signature, message);
}

describe("IndexedDbDeviceSignerKeyStorage", () => {
    beforeEach(() => {
        globalThis.indexedDB = new IDBFactory();
    });

    it("reads and signs with a key that an earlier storage instance created", async () => {
        const first = new IndexedDbDeviceSignerKeyStorage(API_KEY);
        const publicKeyBase64 = await first.generateKey({ address: ADDRESS });
        first.destroy();

        const second = new IndexedDbDeviceSignerKeyStorage(API_KEY);
        const message = new TextEncoder().encode("hello");
        const signature = await second.signMessage(ADDRESS, Buffer.from(message).toString("base64"));

        expect(await second.getKey(ADDRESS)).toBe(publicKeyBase64);
        expect(await second.hasKey(publicKeyBase64)).toBe(true);
        expect(await verifies(publicKeyBase64, message, signature)).toBe(true);
    });

    it("maps an address to a key that was generated without one", async () => {
        const storage = new IndexedDbDeviceSignerKeyStorage(API_KEY);
        const publicKeyBase64 = await storage.generateKey({});

        await storage.mapAddressToKey(ADDRESS, publicKeyBase64);

        expect(await storage.getKey(ADDRESS)).toBe(publicKeyBase64);
    });

    it("returns the existing key when generating again for the same address", async () => {
        const storage = new IndexedDbDeviceSignerKeyStorage(API_KEY);
        const publicKeyBase64 = await storage.generateKey({ address: ADDRESS });

        expect(await storage.generateKey({ address: ADDRESS })).toBe(publicKeyBase64);
    });

    it("rejects mapping an address that already has a different key", async () => {
        const storage = new IndexedDbDeviceSignerKeyStorage(API_KEY);
        await storage.generateKey({ address: ADDRESS });
        const otherKey = await storage.generateKey({});

        await expect(storage.mapAddressToKey(ADDRESS, otherKey)).rejects.toThrow(
            `Address ${ADDRESS} already has a different key stored`
        );
    });

    it("forgets the key after deleteKey", async () => {
        const storage = new IndexedDbDeviceSignerKeyStorage(API_KEY);
        const publicKeyBase64 = await storage.generateKey({ address: ADDRESS });

        await storage.deleteKey(ADDRESS);

        expect(await storage.getKey(ADDRESS)).toBeNull();
        expect(await storage.hasKey(publicKeyBase64)).toBe(false);
        await expect(storage.signMessage(ADDRESS, "aGVsbG8=")).rejects.toThrow(
            `No key pair found for address ${ADDRESS}`
        );
    });

    it("rejects biometric policies instead of creating a key without the check", async () => {
        const storage = new IndexedDbDeviceSignerKeyStorage(API_KEY);

        await expect(storage.generateKey({ address: ADDRESS, biometricPolicy: "always" })).rejects.toThrow(
            'Biometric policy "always" is not supported by this key storage'
        );
        expect(await storage.getKey(ADDRESS)).toBeNull();
    });
});
