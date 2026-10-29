import { CrossmintErrors } from "@crossmint/common-sdk-base";
import { describe, expect, test } from "vitest";

import {
    DuplicateRecoverySignerError,
    JWTDecryptionError,
    JWTExpiredError,
    JWTIdentifierError,
    JWTInvalidError,
    NotAuthorizedError,
    NotSupportedOnApiVersionError,
    QuorumRequestError,
    QuorumSelectionAmbiguousError,
    RecoveryAdminSignerConflictError,
    RecoveryNotSupportedOnChainError,
    RecoverySignerConflictError,
    RecoverySignerLimitExceededError,
    RecoveryMethodRequiredError,
    SignerRequiredError,
    TransactionExpiredError,
    TransactionFailedError,
    throwIfCrossmintApiAuthError,
    throwIfQuorumApiError,
    throwIfRecoverySignerApiError,
} from "./errors";

describe("throwIfCrossmintApiAuthError", () => {
    test("throws JWTExpiredError with the reported expiry when the code is ERROR_JWT_EXPIRED", () => {
        const expiredAt = "2026-07-07T21:28:41.000Z";
        const body = { error: true, message: "expired", code: "ERROR_JWT_EXPIRED", expiredAt };

        try {
            throwIfCrossmintApiAuthError(body);
            expect.fail("Expected throwIfCrossmintApiAuthError to throw");
        } catch (error) {
            expect(error).toBeInstanceOf(JWTExpiredError);
            const jwtError = error as JWTExpiredError;
            expect(jwtError.code).toBe(CrossmintErrors.JWT_EXPIRED);
            expect(jwtError.expiredAt).toBe(expiredAt);
        }
    });

    test("throws JWTInvalidError when the code is ERROR_JWT_INVALID", () => {
        expect(() => throwIfCrossmintApiAuthError({ error: true, code: "ERROR_JWT_INVALID" })).toThrow(JWTInvalidError);
    });

    test("throws JWTDecryptionError when the code is ERROR_JWT_DECRYPTION", () => {
        expect(() => throwIfCrossmintApiAuthError({ error: true, code: "ERROR_JWT_DECRYPTION" })).toThrow(
            JWTDecryptionError
        );
    });

    test("throws JWTIdentifierError with the identifier key when the code is ERROR_JWT_IDENTIFIER_ERROR", () => {
        try {
            throwIfCrossmintApiAuthError({ error: true, code: "ERROR_JWT_IDENTIFIER_ERROR", identifierKey: "sub" });
            expect.fail("Expected throwIfCrossmintApiAuthError to throw");
        } catch (error) {
            expect(error).toBeInstanceOf(JWTIdentifierError);
            expect((error as JWTIdentifierError).identifierKey).toBe("sub");
        }
    });

    test("throws NotAuthorizedError when the code is ERROR_JWT_AUDIENCE_MISMATCH", () => {
        expect(() => throwIfCrossmintApiAuthError({ error: true, code: "ERROR_JWT_AUDIENCE_MISMATCH" })).toThrow(
            NotAuthorizedError
        );
    });

    test("does not throw for non-auth error bodies", () => {
        expect(() => throwIfCrossmintApiAuthError({ error: true, message: "Transaction not found" })).not.toThrow();
        expect(() => throwIfCrossmintApiAuthError({ error: true, code: "SOME_OTHER_ERROR" })).not.toThrow();
        expect(() => throwIfCrossmintApiAuthError(null)).not.toThrow();
        expect(() => throwIfCrossmintApiAuthError("string")).not.toThrow();
    });
});

describe("RecoveryMethodRequiredError", () => {
    test("is a SignerRequiredError with the SIGNER_INVALID code", () => {
        const error = new RecoveryMethodRequiredError("select a recovery method", "details");

        expect(error).toBeInstanceOf(RecoveryMethodRequiredError);
        expect(error).toBeInstanceOf(SignerRequiredError);
        expect(error.code).toBe(CrossmintErrors.SIGNER_INVALID);
        expect(error.message).toBe("select a recovery method");
        expect(error.details).toBe("details");
    });

    test("is not thrown for the SIGNER_REQUIRED API code, which stays a plain SignerRequiredError", () => {
        try {
            throwIfRecoverySignerApiError({ error: true, code: "SIGNER_REQUIRED" });
            expect.fail("Expected throwIfRecoverySignerApiError to throw");
        } catch (error) {
            expect(error).toBeInstanceOf(SignerRequiredError);
            expect(error).not.toBeInstanceOf(RecoveryMethodRequiredError);
        }
    });
});

describe("throwIfRecoverySignerApiError", () => {
    const recoveryErrorCases = [
        { code: "SIGNER_LIMIT_EXCEEDED", errorClass: RecoverySignerLimitExceededError },
        { code: "RECOVERY_DUPLICATE_SIGNER", errorClass: DuplicateRecoverySignerError },
        { code: "RECOVERY_SIGNER_CONFLICT", errorClass: RecoverySignerConflictError },
        { code: "SIGNER_REQUIRED", errorClass: SignerRequiredError },
        { code: "RECOVERY_NOT_SUPPORTED_ON_CHAIN", errorClass: RecoveryNotSupportedOnChainError },
        { code: "NOT_SUPPORTED_ON_API_VERSION", errorClass: NotSupportedOnApiVersionError },
        { code: "RECOVERY_ADMIN_SIGNER_CONFLICT", errorClass: RecoveryAdminSignerConflictError },
    ];

    test.each(recoveryErrorCases)("throws $errorClass.name when the code is $code", ({ code, errorClass }) => {
        expect(() => throwIfRecoverySignerApiError({ error: true, code })).toThrow(errorClass);
    });

    test("surfaces the API message and the full response body as details", () => {
        const body = { error: true, code: "RECOVERY_DUPLICATE_SIGNER", message: "signer already an admin" };

        try {
            throwIfRecoverySignerApiError(body);
            expect.fail("Expected throwIfRecoverySignerApiError to throw");
        } catch (error) {
            expect((error as DuplicateRecoverySignerError).message).toBe("signer already an admin");
            expect((error as DuplicateRecoverySignerError).details).toBe(JSON.stringify(body));
        }
    });

    test("falls back to a descriptive message when the API sends none", () => {
        expect(() => throwIfRecoverySignerApiError({ error: true, code: "SIGNER_LIMIT_EXCEEDED" })).toThrow(
            "The wallet exceeds the maximum number of recovery signers"
        );
    });

    test("does not throw for unrelated error bodies", () => {
        expect(() => throwIfRecoverySignerApiError({ error: true, message: "Wallet not found" })).not.toThrow();
        expect(() => throwIfRecoverySignerApiError({ error: true, code: "SOME_OTHER_ERROR" })).not.toThrow();
        expect(() => throwIfRecoverySignerApiError(null)).not.toThrow();
    });
});

describe("throwIfQuorumApiError", () => {
    // The quorum codes the wallets API defines (crossbit-main `constants/error.ts` and `quorum-errors.ts`).
    const QUORUM_ERROR_CODES = [
        "QUORUM_SIGNER_UNSUPPORTED",
        "QUORUM_SIZE_INVALID",
        "QUORUM_MEMBER_DUPLICATED",
        "QUORUM_MEMBER_TYPE_UNSUPPORTED",
        "QUORUM_MEMBER_TYPE_NOT_ALLOWED",
        "NESTED_QUORUM_NOT_ALLOWED",
        "QUORUM_TOO_FEW_MEMBERS",
        "QUORUM_THRESHOLD_EXCEEDS_MEMBERS",
        "SIGNER_IS_QUORUM_MEMBER",
        "QUORUM_APPROVING_MEMBERS_COUNT_MISMATCH",
        "QUORUM_APPROVING_MEMBER_INVALID",
        "APPROVING_MEMBERS_NOT_APPLICABLE",
        "SCOPED_QUORUM_CANNOT_SIGN",
    ];

    describe("when the code is a quorum error code", () => {
        test.each(QUORUM_ERROR_CODES)(
            "throws QuorumRequestError with reason %s, the API message and the body",
            (code) => {
                const body = { error: true, code, message: `rejected: ${code}` };

                try {
                    throwIfQuorumApiError(body);
                    expect.fail("Expected throwIfQuorumApiError to throw");
                } catch (error) {
                    expect(error).toBeInstanceOf(QuorumRequestError);
                    const quorumError = error as QuorumRequestError;
                    expect(quorumError.reason).toBe(code);
                    expect(quorumError.code).toBe(CrossmintErrors.SIGNER_INVALID);
                    expect(quorumError.message).toBe(`rejected: ${code}`);
                    expect(quorumError.details).toBe(JSON.stringify(body));
                }
            }
        );

        test("falls back to a message naming the code when the API sends none", () => {
            expect(() => throwIfQuorumApiError({ code: "QUORUM_TOO_FEW_MEMBERS" })).toThrow(
                "The wallets API rejected the quorum request: QUORUM_TOO_FEW_MEMBERS"
            );
        });
    });

    describe("when the code is TRANSACTION_EXPIRED", () => {
        const body = { code: "TRANSACTION_EXPIRED", message: "The transaction expired before it could be submitted." };

        test("throws TransactionExpiredError, a TransactionFailedError, with the API message and the body", () => {
            try {
                throwIfQuorumApiError(body, { transactionId: "tx-1" });
                expect.fail("Expected throwIfQuorumApiError to throw");
            } catch (error) {
                expect(error).toBeInstanceOf(TransactionExpiredError);
                expect(error).toBeInstanceOf(TransactionFailedError);
                const expiredError = error as TransactionExpiredError;
                expect(expiredError.code).toBe(CrossmintErrors.TRANSACTION_FAILED);
                expect(expiredError.message).toBe(body.message);
                expect(expiredError.details).toBe(JSON.stringify(body));
            }
        });

        test.each([
            { request: { transactionId: "tx-1" }, kind: "transaction" },
            { request: { signatureId: "sig-1" }, kind: "signature" },
            { request: {}, kind: "unknown" },
        ])("carries the $kind request id the call site passed", ({ request }) => {
            try {
                throwIfQuorumApiError(body, request);
                expect.fail("Expected throwIfQuorumApiError to throw");
            } catch (error) {
                const expiredError = error as TransactionExpiredError;
                expect({
                    transactionId: expiredError.transactionId,
                    signatureId: expiredError.signatureId,
                }).toEqual({ transactionId: undefined, signatureId: undefined, ...request });
            }
        });
    });

    describe("when the body has no code or an unrelated code", () => {
        test("returns without throwing", () => {
            expect(() => throwIfQuorumApiError({ error: true, message: "Wallet not found" })).not.toThrow();
            expect(() => throwIfQuorumApiError({ error: true, code: "SIGNER_LIMIT_EXCEEDED" })).not.toThrow();
            expect(() => throwIfQuorumApiError({ code: "QUORUM_MEMBER_NOT_DESIGNATED" })).not.toThrow();
            expect(() => throwIfQuorumApiError(null)).not.toThrow();
        });
    });
});

describe("QuorumSelectionAmbiguousError", () => {
    test("names every matching quorum and keeps their locators", () => {
        const quorumLocators = [
            "quorum:3f9c2b8e-5d1a-8c4f-9e2b-7a6d5c4b3a21",
            "quorum:7b1d4e6a-2c3f-8a5b-9d8e-1f2a3b4c5d6e",
        ] as const;

        const error = new QuorumSelectionAmbiguousError([...quorumLocators]);

        expect(error.quorumLocators).toEqual(quorumLocators);
        expect(error.code).toBe(CrossmintErrors.SIGNER_INVALID);
        for (const locator of quorumLocators) {
            expect(error.message).toContain(locator);
        }
    });
});
