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
    RecoveryAdminSignerConflictError,
    RecoveryNotSupportedOnChainError,
    RecoverySignerConflictError,
    RecoverySignerLimitExceededError,
    SignerRequiredError,
    throwIfCrossmintApiAuthError,
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
