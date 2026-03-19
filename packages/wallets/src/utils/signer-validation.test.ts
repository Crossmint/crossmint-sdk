import { describe, expect, it } from "vitest";
import { compareSignerConfigs } from "./signer-validation";
import { WalletCreationError } from "./errors";

describe("compareSignerConfigs - Email Normalization", () => {
    describe("Gmail email normalization", () => {
        it("should match dotted Gmail address with normalized version", () => {
            const newConfig = {
                type: "email",
                email: "jer.coffey@gmail.com",
            };

            const existingConfig = {
                type: "email",
                email: "jercoffey@gmail.com",
            };

            expect(() => compareSignerConfigs(newConfig, existingConfig)).not.toThrow();
        });

        it("should match multiple dots in Gmail address", () => {
            const newConfig = {
                type: "email",
                email: "eugene.wase@gmail.com",
            };

            const existingConfig = {
                type: "email",
                email: "eugenewase@gmail.com",
            };

            expect(() => compareSignerConfigs(newConfig, existingConfig)).not.toThrow();
        });

        it("should match dotted Gmail addresses in reverse order", () => {
            const newConfig = {
                type: "email",
                email: "torisamples@gmail.com",
            };

            const existingConfig = {
                type: "email",
                email: "tori.samples@gmail.com",
            };

            expect(() => compareSignerConfigs(newConfig, existingConfig)).not.toThrow();
        });

        it("should match complex dotted Gmail address", () => {
            const newConfig = {
                type: "email",
                email: "gabriel.hidalgo@gmail.com",
            };

            const existingConfig = {
                type: "email",
                email: "gabrielhidalgo@gmail.com",
            };

            expect(() => compareSignerConfigs(newConfig, existingConfig)).not.toThrow();
        });

        it("should handle googlemail.com domain", () => {
            const newConfig = {
                type: "email",
                email: "test.user@googlemail.com",
            };

            const existingConfig = {
                type: "email",
                email: "testuser@gmail.com",
            };

            expect(() => compareSignerConfigs(newConfig, existingConfig)).not.toThrow();
        });

        it("should handle case insensitivity", () => {
            const newConfig = {
                type: "email",
                email: "Test.User@Gmail.com",
            };

            const existingConfig = {
                type: "email",
                email: "testuser@gmail.com",
            };

            expect(() => compareSignerConfigs(newConfig, existingConfig)).not.toThrow();
        });
    });

    describe("Non-Gmail email normalization", () => {
        it("should preserve dots in non-Gmail addresses", () => {
            const newConfig = {
                type: "email",
                email: "user.name@icloud.com",
            };

            const existingConfig = {
                type: "email",
                email: "username@icloud.com",
            };

            expect(() => compareSignerConfigs(newConfig, existingConfig)).toThrow(WalletCreationError);
        });

        it("should match identical non-Gmail addresses with dots", () => {
            const newConfig = {
                type: "email",
                email: "user.name@stellar.org",
            };

            const existingConfig = {
                type: "email",
                email: "user.name@stellar.org",
            };

            expect(() => compareSignerConfigs(newConfig, existingConfig)).not.toThrow();
        });

        it("should handle case insensitivity for non-Gmail addresses", () => {
            const newConfig = {
                type: "email",
                email: "User.Name@Example.com",
            };

            const existingConfig = {
                type: "email",
                email: "user.name@example.com",
            };

            expect(() => compareSignerConfigs(newConfig, existingConfig)).not.toThrow();
        });
    });

    describe("Error cases", () => {
        it("should throw error for truly different Gmail addresses", () => {
            const newConfig = {
                type: "email",
                email: "user1@gmail.com",
            };

            const existingConfig = {
                type: "email",
                email: "user2@gmail.com",
            };

            expect(() => compareSignerConfigs(newConfig, existingConfig)).toThrow(WalletCreationError);
            expect(() => compareSignerConfigs(newConfig, existingConfig)).toThrow(
                /Wallet signer configuration mismatch at "email"/
            );
        });

        it("should throw error for different non-Gmail addresses", () => {
            const newConfig = {
                type: "email",
                email: "user1@example.com",
            };

            const existingConfig = {
                type: "email",
                email: "user2@example.com",
            };

            expect(() => compareSignerConfigs(newConfig, existingConfig)).toThrow(WalletCreationError);
        });
    });

    describe("Nested signer configs", () => {
        it("should normalize emails in nested objects", () => {
            const newConfig = {
                adminSigner: {
                    type: "email",
                    email: "test.user@gmail.com",
                },
            };

            const existingConfig = {
                adminSigner: {
                    type: "email",
                    email: "testuser@gmail.com",
                },
            };

            expect(() => compareSignerConfigs(newConfig, existingConfig)).not.toThrow();
        });
    });

    describe("Non-email fields", () => {
        it("should not affect non-email string comparisons", () => {
            const newConfig = {
                type: "passkey",
                id: "test-id-123",
            };

            const existingConfig = {
                type: "passkey",
                id: "test-id-123",
            };

            expect(() => compareSignerConfigs(newConfig, existingConfig)).not.toThrow();
        });

        it("should throw for different non-email strings", () => {
            const newConfig = {
                type: "passkey",
                id: "test-id-123",
            };

            const existingConfig = {
                type: "passkey",
                id: "test-id-456",
            };

            expect(() => compareSignerConfigs(newConfig, existingConfig)).toThrow(WalletCreationError);
        });
    });

    describe("Hex/Decimal normalization (device signer publicKey)", () => {
        it("should match hex publicKey.x with decimal equivalent from API", () => {
            const newConfig = {
                type: "device",
                publicKey: {
                    x: "0xff",
                    y: "0x01",
                },
            };

            const existingConfig = {
                type: "device",
                publicKey: {
                    x: "255",
                    y: "1",
                },
            };

            expect(() => compareSignerConfigs(newConfig, existingConfig)).not.toThrow();
        });

        it("should match large hex values with their decimal equivalents", () => {
            const hexValue = "0xf4f4387d09a234f8b81b842a9755e5c0ab87079e5eab0b0b7e1e4fc88b3be759";
            const decimalValue = BigInt(hexValue).toString();

            const newConfig = {
                type: "device",
                publicKey: {
                    x: hexValue,
                    y: "0xabcd",
                },
            };

            const existingConfig = {
                type: "device",
                publicKey: {
                    x: decimalValue,
                    y: BigInt("0xabcd").toString(),
                },
            };

            expect(() => compareSignerConfigs(newConfig, existingConfig)).not.toThrow();
        });

        it("should match when both values are already decimal strings", () => {
            const newConfig = {
                type: "device",
                publicKey: {
                    x: "12345",
                    y: "67890",
                },
            };

            const existingConfig = {
                type: "device",
                publicKey: {
                    x: "12345",
                    y: "67890",
                },
            };

            expect(() => compareSignerConfigs(newConfig, existingConfig)).not.toThrow();
        });

        it("should throw for numerically different hex and decimal values", () => {
            const newConfig = {
                type: "device",
                publicKey: {
                    x: "0xff",
                    y: "0x01",
                },
            };

            const existingConfig = {
                type: "device",
                publicKey: {
                    x: "256",
                    y: "1",
                },
            };

            expect(() => compareSignerConfigs(newConfig, existingConfig)).toThrow(WalletCreationError);
        });

        it("should not treat non-hex 0x-like strings as hex", () => {
            const newConfig = {
                type: "device",
                publicKey: {
                    x: "0xGHIJ",
                },
            };

            const existingConfig = {
                type: "device",
                publicKey: {
                    x: "0xHIJK",
                },
            };

            expect(() => compareSignerConfigs(newConfig, existingConfig)).toThrow(WalletCreationError);
        });

        it("should not normalize hex for non-publicKey fields like addresses", () => {
            const newConfig = {
                type: "external-wallet",
                address: "0x742d35Cc6634C0532925a3b844Bc454e4438f44e",
            };

            const existingConfig = {
                type: "external-wallet",
                address: "0x742d35Cc6634C0532925a3b844Bc454e4438f44e",
            };

            expect(() => compareSignerConfigs(newConfig, existingConfig)).not.toThrow();
        });

        it("should treat different hex addresses as different even if numerically close", () => {
            const newConfig = {
                type: "external-wallet",
                address: "0x00ff",
            };

            const existingConfig = {
                type: "external-wallet",
                address: "0xff",
            };

            expect(() => compareSignerConfigs(newConfig, existingConfig)).toThrow(WalletCreationError);
        });
    });
});
