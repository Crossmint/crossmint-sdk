import { P256 } from "ox";
import { describe, expect, it } from "vitest";
import { SandboxDeviceSignerKeyStorage } from "./device-signer-sandbox";

const ADDRESS = "0x1234567890123456789012345678901234567890";
const OTHER_ADDRESS = "0xabcdefabcdefabcdefabcdefabcdefabcdefabcd";
const MESSAGE = `0x${"ab".repeat(32)}`;

function publicKeyFromBase64(base64: string) {
    const bytes = Buffer.from(base64, "base64");
    return {
        prefix: 4 as const,
        x: BigInt(`0x${bytes.subarray(1, 33).toString("hex")}`),
        y: BigInt(`0x${bytes.subarray(33, 65).toString("hex")}`),
    };
}

describe("SandboxDeviceSignerKeyStorage", () => {
    it("generates a key, maps it to an address, and produces a signature verifiable against the public key", async () => {
        const storage = new SandboxDeviceSignerKeyStorage("sk_test");

        const publicKeyBase64 = await storage.generateKey({ address: ADDRESS });
        expect(await storage.getKey(ADDRESS)).toBe(publicKeyBase64);
        expect(await storage.hasKey(publicKeyBase64)).toBe(true);

        const { r, s } = await storage.signMessage(ADDRESS, MESSAGE);
        const publicKey = publicKeyFromBase64(publicKeyBase64);
        const signature = { r: BigInt(r), s: BigInt(s) };

        expect(P256.verify({ publicKey, payload: MESSAGE, signature, hash: false })).toBe(true);
        expect(P256.verify({ publicKey, payload: `0x${"cd".repeat(32)}`, signature, hash: false })).toBe(false);
    });

    it("deletes a key so the address no longer resolves", async () => {
        const storage = new SandboxDeviceSignerKeyStorage("sk_test");
        await storage.generateKey({ address: ADDRESS });

        await storage.deleteKey(ADDRESS);

        expect(await storage.getKey(ADDRESS)).toBeNull();
        await expect(storage.signMessage(ADDRESS, MESSAGE)).rejects.toThrow(/No key mapped/);
    });

    it("keeps a key usable for a second address until both are deleted", async () => {
        const storage = new SandboxDeviceSignerKeyStorage("sk_test");
        const publicKeyBase64 = await storage.generateKey({ address: ADDRESS });
        await storage.mapAddressToKey(OTHER_ADDRESS, publicKeyBase64);

        await storage.deleteKey(ADDRESS);

        expect(await storage.getKey(OTHER_ADDRESS)).toBe(publicKeyBase64);
        await expect(storage.signMessage(OTHER_ADDRESS, MESSAGE)).resolves.toMatchObject({
            r: expect.stringMatching(/^0x[0-9a-f]{64}$/),
        });

        await storage.deleteKey(OTHER_ADDRESS);
        await expect(storage.signMessage(OTHER_ADDRESS, MESSAGE)).rejects.toThrow(/No key mapped/);
    });

    describe("failure overrides", () => {
        it("key-absent: reports no key even after one was generated", async () => {
            const storage = new SandboxDeviceSignerKeyStorage("sk_test", "key-absent");
            await storage.generateKey({ address: ADDRESS });

            expect(await storage.getKey(ADDRESS)).toBeNull();
            expect(await storage.hasKey(await storage.generateKey({ address: ADDRESS }))).toBe(false);
            await expect(storage.signMessage(ADDRESS, MESSAGE)).rejects.toThrow(/No key mapped/);
        });

        it("key-unusable: the key resolves but signing fails", async () => {
            const storage = new SandboxDeviceSignerKeyStorage("sk_test");
            await storage.generateKey({ address: ADDRESS });
            storage.setFailure("key-unusable");

            expect(await storage.getKey(ADDRESS)).not.toBeNull();
            await expect(storage.signMessage(ADDRESS, MESSAGE)).rejects.toThrow(/SIGNING_FAILED/);
        });

        it("storage-unreadable: every operation fails, not just signing", async () => {
            const storage = new SandboxDeviceSignerKeyStorage("sk_test", "storage-unreadable");

            await expect(storage.generateKey({ address: ADDRESS })).rejects.toThrow(/unavailable/);
            await expect(storage.getKey(ADDRESS)).rejects.toThrow(/unavailable/);
            await expect(storage.hasKey("anything")).rejects.toThrow(/unavailable/);
            await expect(storage.signMessage(ADDRESS, MESSAGE)).rejects.toThrow(/unavailable/);
            await expect(storage.deleteKey(ADDRESS)).rejects.toThrow(/unavailable/);
        });

        it("setFailure can be cleared to restore normal behavior", async () => {
            const storage = new SandboxDeviceSignerKeyStorage("sk_test", "storage-unreadable");
            storage.setFailure(undefined);

            const publicKeyBase64 = await storage.generateKey({ address: ADDRESS });
            expect(await storage.getKey(ADDRESS)).toBe(publicKeyBase64);
        });
    });
});
