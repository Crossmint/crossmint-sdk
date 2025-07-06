import { describe, it, expect, vi, beforeEach } from "vitest";
import { StellarEmailSigner } from "./stellar-email-signer";
import { StrKey } from "@stellar/stellar-sdk";
import base58 from "bs58";
import type { EmailInternalSignerConfig } from "../types";
import type { Crossmint } from "@crossmint/common-sdk-base";

describe("StellarEmailSigner", () => {
    let mockConfig: EmailInternalSignerConfig;
    let mockCrossmint: Crossmint;

    beforeEach(() => {
        mockCrossmint = {
            apiKey: "test-api-key",
        } as Crossmint;

        mockConfig = {
            type: "email",
            email: "test@example.com",
            signerAddress: "GDZJ4V22FA47GD2DHNRNDJZSGXQJSYTZWZSBJHQEQ555DSLALA4PSOEV",
            crossmint: mockCrossmint,
        };
    });

    describe("constructor", () => {
        it("should create a StellarEmailSigner instance", () => {
            const signer = new StellarEmailSigner(mockConfig);
            expect(signer).toBeInstanceOf(StellarEmailSigner);
            expect(signer.type).toBe("email");
        });
    });

    describe("locator", () => {
        it("should return stellar-keypair locator", () => {
            const signer = new StellarEmailSigner(mockConfig);
            const locator = signer.locator();
            expect(locator).toBe("stellar-keypair:GDZJ4V22FA47GD2DHNRNDJZSGXQJSYTZWZSBJHQEQ555DSLALA4PSOEV");
        });
    });

    describe("signMessage", () => {
        it("should reject with not implemented error", async () => {
            const signer = new StellarEmailSigner(mockConfig);
            await expect(signer.signMessage()).rejects.toThrow(
                "signMessage method not implemented for stellar email signer"
            );
        });
    });

    describe("pregenerateSigner", () => {
        it("should transform ed25519 public key bytes to Stellar address format", async () => {
            const testPublicKeyBytes = new Uint8Array([242, 158, 87, 90, 40, 57, 243, 15, 67, 59, 98, 209, 167, 50, 53, 224, 153, 98, 121, 182, 100, 20, 158, 4, 135, 123, 209, 201, 96, 88, 56, 249]);
            const expectedStellarAddress = "GDZJ4V22FA47GD2DHNRNDJZSGXQJSYTZWZSBJHQEQ555DSLALA4PSOEV";

            const mockApiClient = {
                pregenerateSigner: vi.fn().mockResolvedValue({
                    publicKey: {
                        bytes: base58.encode(testPublicKeyBytes),
                        encoding: "base58",
                        keyType: "ed25519",
                    },
                }),
            };

            vi.doMock("./email-signer-api-client", () => ({
                EmailSignerApiClient: vi.fn().mockImplementation(() => mockApiClient),
            }));

            const result = await StellarEmailSigner.pregenerateSigner("test@example.com", mockCrossmint);
            expect(result).toBe(expectedStellarAddress);
            expect(mockApiClient.pregenerateSigner).toHaveBeenCalledWith("test@example.com", "ed25519");
        });

        it("should throw error when email is not provided", async () => {
            await expect(
                StellarEmailSigner.pregenerateSigner("", mockCrossmint)
            ).rejects.toThrow("Email is required to pregenerate a signer");
        });

        it("should throw error when API call fails", async () => {
            const mockApiClient = {
                pregenerateSigner: vi.fn().mockRejectedValue(new Error("API Error")),
            };

            vi.doMock("./email-signer-api-client", () => ({
                EmailSignerApiClient: vi.fn().mockImplementation(() => mockApiClient),
            }));

            await expect(
                StellarEmailSigner.pregenerateSigner("test@example.com", mockCrossmint)
            ).rejects.toThrow("API Error");
        });
    });

    describe("verifyPublicKeyFormat", () => {
        it("should pass for valid ed25519 base58 public key", () => {
            const validPublicKey = {
                bytes: "base58-encoded-key",
                encoding: "base58",
                keyType: "ed25519",
            };

            expect(() => StellarEmailSigner.verifyPublicKeyFormat(validPublicKey)).not.toThrow();
        });

        it("should throw error for null public key", () => {
            expect(() => StellarEmailSigner.verifyPublicKeyFormat(null)).toThrow("No public key found");
        });

        it("should throw error for wrong encoding", () => {
            const invalidPublicKey = {
                bytes: "hex-encoded-key",
                encoding: "hex",
                keyType: "ed25519",
            };

            expect(() => StellarEmailSigner.verifyPublicKeyFormat(invalidPublicKey)).toThrow(
                "Not supported. Expected public key to be in base58 encoding and ed25519 key type"
            );
        });

        it("should throw error for wrong key type", () => {
            const invalidPublicKey = {
                bytes: "base58-encoded-key",
                encoding: "base58",
                keyType: "secp256k1",
            };

            expect(() => StellarEmailSigner.verifyPublicKeyFormat(invalidPublicKey)).toThrow(
                "Not supported. Expected public key to be in base58 encoding and ed25519 key type"
            );
        });
    });

    describe("decodeStellarAddress", () => {
        it("should decode valid Stellar address to public key bytes", () => {
            const stellarAddress = "GDZJ4V22FA47GD2DHNRNDJZSGXQJSYTZWZSBJHQEQ555DSLALA4PSOEV";
            const expectedBytes = new Uint8Array([242, 158, 87, 90, 40, 57, 243, 15, 67, 59, 98, 209, 167, 50, 53, 224, 153, 98, 121, 182, 100, 20, 158, 4, 135, 123, 209, 201, 96, 88, 56, 249]);

            const result = StellarEmailSigner.decodeStellarAddress(stellarAddress);
            expect(result).toEqual(expectedBytes);
        });

        it("should throw error for invalid Stellar address", () => {
            const invalidAddress = "invalid-stellar-address";

            expect(() => StellarEmailSigner.decodeStellarAddress(invalidAddress)).toThrow(
                "Invalid Stellar address format: invalid-stellar-address"
            );
        });
    });

    describe("Stellar address encoding/decoding round trip", () => {
        it("should correctly encode and decode the specific test case", () => {
            const testBytes = new Uint8Array([242, 158, 87, 90, 40, 57, 243, 15, 67, 59, 98, 209, 167, 50, 53, 224, 153, 98, 121, 182, 100, 20, 158, 4, 135, 123, 209, 201, 96, 88, 56, 249]);
            const expectedAddress = "GDZJ4V22FA47GD2DHNRNDJZSGXQJSYTZWZSBJHQEQ555DSLALA4PSOEV";

            const encodedAddress = StrKey.encodeEd25519PublicKey(Buffer.from(testBytes));
            expect(encodedAddress).toBe(expectedAddress);

            const decodedBytes = StellarEmailSigner.decodeStellarAddress(encodedAddress);
            expect(decodedBytes).toEqual(testBytes);
        });
    });
});
