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
});
