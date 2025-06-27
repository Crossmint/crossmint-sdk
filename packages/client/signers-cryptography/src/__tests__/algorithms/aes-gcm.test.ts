import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { AesGcm } from "../../algorithms/symmetric/aes-gcm";
import type { SymmetricKeyProvider } from "../../types/providers";

describe("AesGcm", () => {
    let key: CryptoKey;
    let mockKeyProvider: SymmetricKeyProvider;

    beforeEach(async () => {
        key = await crypto.subtle.generateKey({ name: "AES-GCM", length: 256 }, true, ["encrypt", "decrypt"]);

        mockKeyProvider = {
            getSymmetricKey: vi.fn().mockResolvedValue(key),
        };
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it("should encrypt and decrypt data successfully", async () => {
        const handler = new AesGcm();
        const originalData = new TextEncoder().encode("hello world");

        const encryptedData = await handler.encrypt(originalData.buffer, key);
        const decryptedData = await handler.decrypt(encryptedData, key);

        expect(new Uint8Array(decryptedData)).toEqual(originalData);
        expect(new TextDecoder().decode(decryptedData)).toBe("hello world");
    });

    it("should use a different IV for each encryption", async () => {
        const handler = new AesGcm();
        const originalData = new TextEncoder().encode("hello world");

        const encryptedData1 = await handler.encrypt(originalData.buffer, key);
        const encryptedData2 = await handler.encrypt(originalData.buffer, key);

        expect(new Uint8Array(encryptedData1)).not.toEqual(new Uint8Array(encryptedData2));

        const ivLength = 12;
        const iv1 = new Uint8Array(encryptedData1).slice(0, ivLength);
        const iv2 = new Uint8Array(encryptedData2).slice(0, ivLength);
        expect(iv1).not.toEqual(iv2);
    });
});
