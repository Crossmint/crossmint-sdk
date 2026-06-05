import { describe, expect, it } from "vitest";
import type { Approval } from "@/wallets/types";
import { assertApprovalSignatureFormat, registerSignatureValidator } from "./signature-validation";
import { InvalidSignatureForApprovalError } from "./errors";


const ERC_6492_MAGIC_SUFFIX = "6492649264926492649264926492649264926492649264926492649264926492";

function ecdsaSig65Bytes(): string {
    return "0x" + "1a".repeat(32) + "2b".repeat(32) + "1b";
}

function ecdsaSig64Bytes(): string {
    return "0x" + "1a".repeat(32) + "2b".repeat(32);
}

function erc6492WrappedSig(): string {
    return "0x" + "aa".repeat(20) + "bb".repeat(100) + "cc".repeat(65) + ERC_6492_MAGIC_SUFFIX;
}

function p256Approval(signer: string, r = "0x1a2b3c", s = "0x4d5e6f"): Approval {
    return { signer, signature: { r, s } };
}

function passkeyApproval(
    signer: string,
    r = "0x1a2b3c",
    s = "0x4d5e6f",
    metadata: Record<string, unknown> = {
        authenticatorData: "0xdeadbeef",
        clientDataJSON: "{}",
        challengeIndex: 0,
        typeIndex: 0,
        userVerificationRequired: true,
    }
): Approval {
    return { signer, signature: { r, s }, metadata } as unknown as Approval;
}

function forceApproval(signer: string, signature: unknown, extra?: Record<string, unknown>): Approval {
    return { signer, signature, ...extra } as unknown as Approval;
}

// ---------------------------------------------------------------------------
// Error message matchers — mirror invalidSignature() output exactly
// ---------------------------------------------------------------------------

function expectedError(signer: string, message: string): RegExp {
    return new RegExp(`Invalid signature for signer "${escapeRegex(signer)}": ${escapeRegex(message)}`);
}

function escapeRegex(str: string): string {
    return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// ---------------------------------------------------------------------------
// ECDSA signer types
// ---------------------------------------------------------------------------

describe("assertApprovalSignatureFormat", () => {
    const ecdsaSignerLocators = [
        "external-wallet:0xAbC123",
        "server:0xDef456",
        "email:user@example.com",
        "phone:+1234567890",
    ];

    describe("ECDSA signers", () => {
        describe.each(ecdsaSignerLocators)("signer %s", (signer) => {
            it("accepts a valid 65-byte ECDSA signature", () => {
                expect(() =>
                    assertApprovalSignatureFormat({ signer, signature: ecdsaSig65Bytes() })
                ).not.toThrow();
            });

            it("accepts a valid 64-byte ECDSA signature", () => {
                expect(() =>
                    assertApprovalSignatureFormat({ signer, signature: ecdsaSig64Bytes() })
                ).not.toThrow();
            });

            it("rejects a non-hex signature", () => {
                expect(() =>
                    assertApprovalSignatureFormat({ signer, signature: "ab".repeat(65) })
                ).toThrow(expectedError(signer, "expected a hex string"));
            });

            it("rejects a { r, s } object when a hex string is expected", () => {
                expect(() =>
                    assertApprovalSignatureFormat({ signer, signature: { r: "0x1", s: "0x2" } })
                ).toThrow(expectedError(signer, "expected a hex string"));
            });

            it("rejects an ERC-6492-wrapped signature", () => {
                expect(() =>
                    assertApprovalSignatureFormat({ signer, signature: erc6492WrappedSig() })
                ).toThrow(expectedError(signer, "ERC-6492 wrapped signatures are not supported — provide a raw ECDSA signature"));
            });

            it("rejects a signature with incorrect byte length", () => {
                expect(() =>
                    assertApprovalSignatureFormat({ signer, signature: "0x" + "ab".repeat(32) })
                ).toThrow(expectedError(signer, "expected ECDSA with 64 or 65 bytes"));
            });

            it("rejects a structurally invalid signature that passes length check", () => {
                // 65 bytes but invalid r/s/v structure
                const badStructure = "0x" + "00".repeat(64) + "ff";
                expect(() =>
                    assertApprovalSignatureFormat({ signer, signature: badStructure })
                ).toThrow(expectedError(signer, "failed structural parse — not a valid ECDSA signature"));
            });
        });
    });

    // ---------------------------------------------------------------------------
    // P256 device signer
    // ---------------------------------------------------------------------------

    describe("P256 device signer", () => {
        const signer = "device:testkey123";

        it("accepts a valid { r, s } signature", () => {
            expect(() => assertApprovalSignatureFormat(p256Approval(signer))).not.toThrow();
        });

        it("accepts decimal bigint r and s values", () => {
            expect(() =>
                assertApprovalSignatureFormat(p256Approval(signer, "123456789", "987654321"))
            ).not.toThrow();
        });

        it("rejects a plain string signature", () => {
            expect(() =>
                assertApprovalSignatureFormat({ signer, signature: ecdsaSig65Bytes() })
            ).toThrow(expectedError(signer, "Expected P256 signature { r, s } with positive integer within curve order"));
        });

        it("rejects missing r field", () => {
            expect(() =>
                assertApprovalSignatureFormat(forceApproval(signer, { s: "0x1" }))
            ).toThrow(expectedError(signer, "Expected P256 signature { r, s } with positive integer within curve order"));
        });

        it("rejects missing s field", () => {
            expect(() =>
                assertApprovalSignatureFormat(forceApproval(signer, { r: "0x1" }))
            ).toThrow(expectedError(signer, "Expected P256 signature { r, s } with positive integer within curve order"));
        });

        it("rejects zero r value", () => {
            expect(() =>
                assertApprovalSignatureFormat(p256Approval(signer, "0", "0x1"))
            ).toThrow(expectedError(signer, "Expected P256 signature { r, s } with positive integer within curve order"));
        });

        it("rejects negative s value", () => {
            expect(() =>
                assertApprovalSignatureFormat(p256Approval(signer, "0x1", "-1"))
            ).toThrow(expectedError(signer, "Expected P256 signature { r, s } with positive integer within curve order"));
        });

        it("rejects non-numeric r value", () => {
            expect(() =>
                assertApprovalSignatureFormat(p256Approval(signer, "not-a-number", "0x1"))
            ).toThrow(expectedError(signer, "Expected P256 signature { r, s } with positive integer within curve order"));
        });

        it("rejects empty r value", () => {
            expect(() =>
                assertApprovalSignatureFormat(p256Approval(signer, "", "0x1"))
            ).toThrow(expectedError(signer, "Expected P256 signature { r, s } with positive integer within curve order"));
        });
    });

    // ---------------------------------------------------------------------------
    // Passkey signer
    // ---------------------------------------------------------------------------

    describe("P256 passkey signer", () => {
        const signer = "passkey:credential-abc";

        it("accepts a valid passkey approval with well-formed metadata", () => {
            expect(() => assertApprovalSignatureFormat(passkeyApproval(signer))).not.toThrow();
        });

        it("rejects invalid { r, s } (delegates to p256Validator)", () => {
            expect(() =>
                assertApprovalSignatureFormat(passkeyApproval(signer, "not-a-number", "0x1"))
            ).toThrow(expectedError(signer, "Expected P256 signature { r, s } with positive integer within curve order"));
        });

        it("rejects passkey approval without metadata", () => {
            expect(() =>
                assertApprovalSignatureFormat(p256Approval(signer))
            ).toThrow(expectedError(signer, "passkey metadata is required"));
        });

        it("rejects passkey approval with null metadata", () => {
            expect(() =>
                assertApprovalSignatureFormat(forceApproval(signer, { r: "0x1a2b3c", s: "0x4d5e6f" }, { metadata: null }))
            ).toThrow(expectedError(signer, "passkey metadata is required"));
        });

        it("rejects non-hex authenticatorData", () => {
            expect(() =>
                assertApprovalSignatureFormat(passkeyApproval(signer, "0x1a2b3c", "0x4d5e6f", {
                    authenticatorData: "not-hex",
                    clientDataJSON: "{}",
                    challengeIndex: 0,
                    typeIndex: 0,
                    userVerificationRequired: true,
                }))
            ).toThrow(expectedError(signer, "metadata.authenticatorData must be a hex string"));
        });

        it("rejects empty clientDataJSON", () => {
            expect(() =>
                assertApprovalSignatureFormat(passkeyApproval(signer, "0x1a2b3c", "0x4d5e6f", {
                    authenticatorData: "0xdeadbeef",
                    clientDataJSON: "",
                    challengeIndex: 0,
                    typeIndex: 0,
                    userVerificationRequired: true,
                }))
            ).toThrow(expectedError(signer, "metadata.clientDataJSON must be a non-empty string"));
        });

        it("rejects negative challengeIndex", () => {
            expect(() =>
                assertApprovalSignatureFormat(passkeyApproval(signer, "0x1a2b3c", "0x4d5e6f", {
                    authenticatorData: "0xdeadbeef",
                    clientDataJSON: "{}",
                    challengeIndex: -1,
                    typeIndex: 0,
                    userVerificationRequired: true,
                }))
            ).toThrow(expectedError(signer, "metadata.challengeIndex must be a non-negative integer"));
        });

        it("rejects negative typeIndex", () => {
            expect(() =>
                assertApprovalSignatureFormat(passkeyApproval(signer, "0x1a2b3c", "0x4d5e6f", {
                    authenticatorData: "0xdeadbeef",
                    clientDataJSON: "{}",
                    challengeIndex: 0,
                    typeIndex: -1,
                    userVerificationRequired: true,
                }))
            ).toThrow(expectedError(signer, "metadata.typeIndex must be a non-negative integer"));
        });

        it("rejects non-boolean userVerificationRequired", () => {
            expect(() =>
                assertApprovalSignatureFormat(passkeyApproval(signer, "0x1a2b3c", "0x4d5e6f", {
                    authenticatorData: "0xdeadbeef",
                    clientDataJSON: "{}",
                    challengeIndex: 0,
                    typeIndex: 0,
                    userVerificationRequired: "yes",
                }))
            ).toThrow(expectedError(signer, "metadata.userVerificationRequired must be a boolean"));
        });

        it("rejects a plain string signature for passkey", () => {
            expect(() =>
                assertApprovalSignatureFormat({ signer, signature: ecdsaSig65Bytes() })
            ).toThrow(expectedError(signer, "Expected P256 signature { r, s } with positive integer within curve order"));
        });
    });

    describe("api-key signer", () => {
        it("skips validation entirely", () => {
            expect(() =>
                assertApprovalSignatureFormat({ signer: "api-key", signature: "anything" })
            ).not.toThrow();
        });
    });

    describe("unknown signer types", () => {
        it("passes through with a console warning", () => {
            expect(() =>
                assertApprovalSignatureFormat({ signer: "future-signer:xyz", signature: "anything" })
            ).not.toThrow();
        });
    });

    describe("cross-chain compatibility", () => {
        it("accepts valid ECDSA for EVM external-wallet signer", () => {
            expect(() =>
                assertApprovalSignatureFormat({
                    signer: "external-wallet:0x1234567890123456789012345678901234567890",
                    signature: ecdsaSig65Bytes(),
                })
            ).not.toThrow();
        });

        it("accepts valid ECDSA for Solana external-wallet signer", () => {
            expect(() =>
                assertApprovalSignatureFormat({
                    signer: "external-wallet:9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM",
                    signature: ecdsaSig65Bytes(),
                })
            ).not.toThrow();
        });

        it("accepts valid ECDSA for Stellar external-wallet signer", () => {
            expect(() =>
                assertApprovalSignatureFormat({
                    signer: "external-wallet:GCKFBEIYTKP6RCZX6LRQW2JVAVLMGGVSNESWKN7L2YGQNI2DCOHVHJVY",
                    signature: ecdsaSig65Bytes(),
                })
            ).not.toThrow();
        });
    });

    describe("registerSignatureValidator", () => {
        it("allows registering a custom validator for a new signer type", () => {
            // Unique per run to avoid shared-state interference across test runs
            const signerType = `test-custom-${Math.random().toString(36).slice(2)}`;

            const customValidator = {
                validate: (approval: Approval) => {
                    if (typeof approval.signature !== "string" || !approval.signature.startsWith("custom:")) {
                        throw new InvalidSignatureForApprovalError("Custom validator: signature must start with 'custom:'");
                    }
                },
            };

            registerSignatureValidator(signerType, customValidator);

            expect(() =>
                assertApprovalSignatureFormat({ signer: `${signerType}:abc`, signature: "custom:valid" })
            ).not.toThrow();

            expect(() =>
                assertApprovalSignatureFormat({ signer: `${signerType}:abc`, signature: "invalid" })
            ).toThrow("Custom validator: signature must start with 'custom:'");
        });
    });
});