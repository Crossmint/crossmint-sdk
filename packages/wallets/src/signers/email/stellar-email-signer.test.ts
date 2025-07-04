import { describe, expect, test } from "vitest";
import { StellarEmailSigner } from "./stellar-email-signer";

describe("StellarEmailSigner", () => {
    test("should correctly encode public key bytes to Stellar address", () => {
        const publicKeyBytes = [
            242, 158, 87, 90, 40, 57, 243, 15, 67, 59, 98, 209, 167, 50, 53, 224, 153, 98, 121, 182, 100, 20, 158, 4,
            135, 123, 209, 201, 96, 88, 56, 249,
        ];

        const expectedAddress = "GDZJ4V22FA47GD2DHNRNDJZSGXQJSYTZWZSBJHQEQ555DSLALA4PSOEV";

        const result = (StellarEmailSigner as any).publicKeyToStellarAddress(publicKeyBytes);

        expect(result).toBe(expectedAddress);
    });

    test("should verify public key format correctly", () => {
        const validPublicKey = {
            encoding: "base64",
            keyType: "ed25519",
            bytes: "test-bytes",
        };

        expect(() => StellarEmailSigner.verifyPublicKeyFormat(validPublicKey)).not.toThrow();

        const invalidPublicKey = {
            encoding: "hex",
            keyType: "secp256k1",
            bytes: "test-bytes",
        };

        expect(() => StellarEmailSigner.verifyPublicKeyFormat(invalidPublicKey)).toThrow();
    });

    test("should throw error for null public key", () => {
        expect(() => StellarEmailSigner.verifyPublicKeyFormat(null)).toThrow("No public key found");
    });

    test("should handle string-based public key bytes", () => {
        const publicKeyBytesAsBase64 = Buffer.from([
            242, 158, 87, 90, 40, 57, 243, 15, 67, 59, 98, 209, 167, 50, 53, 224, 153, 98, 121, 182, 100, 20, 158, 4,
            135, 123, 209, 201, 96, 88, 56, 249,
        ]).toString("base64");

        const expectedAddress = "GDZJ4V22FA47GD2DHNRNDJZSGXQJSYTZWZSBJHQEQ555DSLALA4PSOEV";

        const result = (StellarEmailSigner as any).publicKeyToStellarAddress(publicKeyBytesAsBase64);

        expect(result).toBe(expectedAddress);
    });

    test("should throw error for unsupported public key format", () => {
        expect(() => (StellarEmailSigner as any).publicKeyToStellarAddress(123)).toThrow(
            "Unsupported public key format"
        );
    });
});
