import { FPE } from "../../algorithms/symmetric/fpe";
import { ECDHKeyProvider } from "../../providers/key-providers/ecdh-provider";
import { mock } from "vitest-mock-extended";
import { describe, it, expect, beforeEach, vi } from "vitest";

describe("FPE", () => {
    let fpe: FPE;
    let input: number[];
    const encryptionKeyProviderMock = mock<ECDHKeyProvider>();

    // Create a proper mock CryptoKey that can be exported
    const mockCryptoKey = {
        algorithm: { name: "AES-GCM", length: 256 },
        extractable: true,
        type: "secret",
        usages: ["encrypt", "decrypt"],
    } as CryptoKey;

    const key = new Uint8Array([
        112, 105, 70, 134, 182, 201, 2, 79, 163, 230, 51, 84, 242, 105, 138, 10,
        214, 195, 186, 219, 90, 157, 132, 181, 18, 34, 253, 157, 17, 29, 46,
        107,
    ]);

    beforeEach(async () => {
        // Mock crypto.subtle.exportKey to return the expected key bytes
        vi.spyOn(crypto.subtle, "exportKey").mockResolvedValue(key.buffer);

        input = Array.from({ length: 6 }, () => Math.floor(Math.random() * 10));
        encryptionKeyProviderMock.getSymmetricKey.mockResolvedValue(
            mockCryptoKey
        );
        fpe = new FPE();
    });

    describe("encrypt-decrypt", () => {
        it("should encrypt and decrypt a number array", async () => {
            const encrypted = await fpe.encrypt(input, mockCryptoKey);
            const decrypted = await fpe.decrypt(encrypted, mockCryptoKey);
            expect(decrypted).toEqual(input);
        });

        // Skipped due to performance, but can be run manually if needed
        it.skip(
            "exhaustive operational check",
            async () => {
                for (let i = 0; i < 1_000_000; i++) {
                    const digits = i
                        .toString()
                        .padStart(6, "0")
                        .split("")
                        .map(Number);
                    const encrypted = await fpe.encrypt(digits, mockCryptoKey);
                    const decrypted = await fpe.decrypt(
                        encrypted,
                        mockCryptoKey
                    );
                    expect(encrypted.some((d) => d < 0 || d >= 10)).toBe(false);
                    expect(decrypted).toEqual(digits);
                }
            },
            10 * 60 * 1000
        );
    });
});
