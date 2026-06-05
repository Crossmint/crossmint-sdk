import { describe, expect, it, vi } from "vitest";
import { assertApprovalSignatureFormat, registerSignatureValidator } from "./signature-validation";
import { InvalidSignatureForApprovalError } from "./errors";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const ERC_6492_MAGIC_SUFFIX = "6492649264926492649264926492649264926492649264926492649264926492";
const P256_ORDER = BigInt("0xFFFFFFFF00000000FFFFFFFFFFFFFFFFBCE6FAADA7179E84F3B9CAC2FC632551");

function validEcdsaSig65(): string {
    // 65 bytes = 130 hex chars, valid r/s/v structure
    const r = "ab".repeat(32);
    const s = "cd".repeat(32);
    const v = "1b"; // recovery id 27
    return `0x${r}${s}${v}`;
}

function validEcdsaSig64(): string {
    // 64 bytes = 128 hex chars (compact signature without v)
    const r = "ab".repeat(32);
    const s = "cd".repeat(32);
    return `0x${r}${s}`;
}

function erc6492WrappedSig(): string {
    return "0x" + "aa".repeat(20) + "bb".repeat(100) + "cc".repeat(65) + ERC_6492_MAGIC_SUFFIX;
}

function validP256Approval(signer: string, r = "0x1a2b3c", s = "0x4d5e6f") {
    return { signer, signature: { r, s } };
}

function validPasskeyApproval(signer: string) {
    return {
        signer,
        signature: { r: "0x1a2b3c", s: "0x4d5e6f" },
        metadata: {
            authenticatorData: "0xauthdata",
            clientDataJSON: '{"type":"webauthn.get"}',
            challengeIndex: 23,
            typeIndex: 1,
            userVerificationRequired: true,
        },
    };
}

// ---------------------------------------------------------------------------
// ecdsaValidator
// ---------------------------------------------------------------------------

describe("assertApprovalSignatureFormat", () => {
    const ecdsaSignerLocators = [
        "external-wallet:0xAbC123",
        "server:0xDef456",
        "email:user@example.com",
        "phone:+1234567890",
    ];

    describe("ecdsaValidator", () => {
        describe.each(ecdsaSignerLocators)("signer %s", (signer) => {
            it("accepts a valid 65-byte hex signature", () => {
                expect(() => assertApprovalSignatureFormat({ signer, signature: validEcdsaSig65() })).not.toThrow();
            });

            it("accepts a valid 64-byte hex signature", () => {
                expect(() => assertApprovalSignatureFormat({ signer, signature: validEcdsaSig64() })).not.toThrow();
            });

            it("rejects a non-hex string", () => {
                expect(() => assertApprovalSignatureFormat({ signer, signature: "not-a-hex-string" })).toThrow(
                    InvalidSignatureForApprovalError
                );
            });

            it("rejects a signature with ERC-6492 suffix", () => {
                expect(() => assertApprovalSignatureFormat({ signer, signature: erc6492WrappedSig() })).toThrow(
                    InvalidSignatureForApprovalError
                );

                expect(() => assertApprovalSignatureFormat({ signer, signature: erc6492WrappedSig() })).toThrow(
                    /ERC-6492/
                );
            });

            it("rejects wrong byte length (e.g. 32 bytes)", () => {
                expect(() =>
                    assertApprovalSignatureFormat({ signer, signature: ("0x" + "ab".repeat(32)) as `0x${string}` })
                ).toThrow(InvalidSignatureForApprovalError);

                expect(() =>
                    assertApprovalSignatureFormat({ signer, signature: ("0x" + "ab".repeat(32)) as `0x${string}` })
                ).toThrow(/32 bytes/);
            });

            it("rejects structurally invalid sig that passes length check", () => {
                // 65 bytes but all zeros — parseSignature will fail on invalid r/s
                const invalidSig = ("0x" + "00".repeat(65)) as `0x${string}`;
                expect(() => assertApprovalSignatureFormat({ signer, signature: invalidSig })).toThrow(
                    InvalidSignatureForApprovalError
                );

                expect(() => assertApprovalSignatureFormat({ signer, signature: invalidSig })).toThrow(
                    /not a valid ECDSA signature/
                );
            });

            it("rejects a structured { r, s } object when string is expected", () => {
                expect(() =>
                    assertApprovalSignatureFormat({ signer, signature: { r: "0x1", s: "0x2" } } as any)
                ).toThrow(InvalidSignatureForApprovalError);
            });
        });
    });

    // ---------------------------------------------------------------------------
    // p256Validator
    // ---------------------------------------------------------------------------

    describe("p256Validator", () => {
        const signer = "device:testkey123";

        it("accepts valid { r, s } within curve order", () => {
            expect(() => assertApprovalSignatureFormat(validP256Approval(signer))).not.toThrow();
        });

        it("accepts r and s just below P256_ORDER", () => {
            const justBelowOrder = "0x" + (P256_ORDER - 1n).toString(16);
            expect(() =>
                assertApprovalSignatureFormat(validP256Approval(signer, justBelowOrder, justBelowOrder))
            ).not.toThrow();
        });

        it("rejects r = 0", () => {
            expect(() => assertApprovalSignatureFormat(validP256Approval(signer, "0x0", "0x1"))).toThrow(
                InvalidSignatureForApprovalError
            );
            expect(() => assertApprovalSignatureFormat(validP256Approval(signer, "0x0", "0x1"))).toThrow(
                /positive integer values/
            );
        });

        it("rejects s = 0", () => {
            expect(() => assertApprovalSignatureFormat(validP256Approval(signer, "0x1", "0x0"))).toThrow(
                InvalidSignatureForApprovalError
            );
        });

        it("rejects r >= P256_ORDER", () => {
            const atOrder = "0x" + P256_ORDER.toString(16);
            expect(() => assertApprovalSignatureFormat(validP256Approval(signer, atOrder, "0x1"))).toThrow(
                InvalidSignatureForApprovalError
            );
        });

        it("rejects s >= P256_ORDER", () => {
            const aboveOrder = "0x" + (P256_ORDER + 1n).toString(16);
            expect(() => assertApprovalSignatureFormat(validP256Approval(signer, "0x1", aboveOrder))).toThrow(
                InvalidSignatureForApprovalError
            );
        });
    });

    // ---------------------------------------------------------------------------
    // passkeyValidator
    // ---------------------------------------------------------------------------

    describe("passkeyValidator", () => {
        const signer = "passkey:credential-abc";

        it("accepts valid { r, s } + well-formed metadata", () => {
            expect(() => assertApprovalSignatureFormat(validPasskeyApproval(signer))).not.toThrow();
        });

        it("rejects valid { r, s } + null metadata", () => {
            expect(() =>
                assertApprovalSignatureFormat({
                    ...validP256Approval(signer),
                    metadata: null,
                } as any)
            ).toThrow(InvalidSignatureForApprovalError);
        });

        it("rejects valid { r, s } + missing metadata", () => {
            expect(() => assertApprovalSignatureFormat(validP256Approval(signer) as any)).toThrow(
                InvalidSignatureForApprovalError
            );
        });

        it("p256 check fires first when { r, s } is invalid even with valid metadata", () => {
            expect(() =>
                assertApprovalSignatureFormat({
                    signer,
                    signature: { r: "0x0", s: "0x0" },
                    metadata: validPasskeyApproval(signer).metadata,
                })
            ).toThrow(/positive integer values/);
        });
    });

    // ---------------------------------------------------------------------------
    // api-key signer (bypass all validation)
    // ---------------------------------------------------------------------------

    describe("api-key signer", () => {
        it("skips validation for api-key signer", () => {
            expect(() => assertApprovalSignatureFormat({ signer: "api-key", signature: "anything" })).not.toThrow();
        });
    });

    // ---------------------------------------------------------------------------
    // Unknown signer types (warn + skip)
    // ---------------------------------------------------------------------------

    describe("unknown signer types", () => {
        it("logs a warning and skips for unrecognized signer types", () => {
            const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

            expect(() =>
                assertApprovalSignatureFormat({ signer: "future-signer:xyz", signature: "anything" })
            ).not.toThrow();

            expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining("No validator for signer type"));

            warnSpy.mockRestore();
        });
    });

    // ---------------------------------------------------------------------------
    // Cross-chain compatibility
    // ---------------------------------------------------------------------------

    describe("cross-chain compatibility", () => {
        it("accepts valid ECDSA for EVM external-wallet signer", () => {
            expect(() =>
                assertApprovalSignatureFormat({
                    signer: "external-wallet:0x1234567890123456789012345678901234567890",
                    signature: validEcdsaSig65(),
                })
            ).not.toThrow();
        });

        it("accepts valid ECDSA for Solana external-wallet signer", () => {
            expect(() =>
                assertApprovalSignatureFormat({
                    signer: "external-wallet:9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM",
                    signature: validEcdsaSig65(),
                })
            ).not.toThrow();
        });

        it("accepts valid ECDSA for Stellar external-wallet signer", () => {
            expect(() =>
                assertApprovalSignatureFormat({
                    signer: "external-wallet:GCKFBEIYTKP6RCZX6LRQW2JVAVLMGGVSNESWKN7L2YGQNI2DCOHVHJVY",
                    signature: validEcdsaSig65(),
                })
            ).not.toThrow();
        });
    });

    // ---------------------------------------------------------------------------
    // Extensibility (registerSignatureValidator)
    // ---------------------------------------------------------------------------

    describe("registerSignatureValidator", () => {
        it("allows registering a custom validator for a new signer type", () => {
            const customValidator = {
                validate: (approval: { signer: string; signature: unknown }) => {
                    if (typeof approval.signature !== "string" || !approval.signature.startsWith("custom:")) {
                        throw new InvalidSignatureForApprovalError(
                            "Custom validator: signature must start with 'custom:'"
                        );
                    }
                },
            };

            registerSignatureValidator("my-custom-signer", customValidator);

            expect(() =>
                assertApprovalSignatureFormat({ signer: "my-custom-signer:abc", signature: "custom:valid" })
            ).not.toThrow();

            expect(() =>
                assertApprovalSignatureFormat({ signer: "my-custom-signer:abc", signature: "invalid" })
            ).toThrow(InvalidSignatureForApprovalError);
        });
    });
});
