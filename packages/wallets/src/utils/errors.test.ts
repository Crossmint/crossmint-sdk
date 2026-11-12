import { CrossmintErrors } from "@crossmint/common-sdk-base";
import { describe, expect, test } from "vitest";

import {
    CollateralFundingTemporarilyUnavailableError,
    CollateralFundsInTransitError,
    CollateralWithdrawalIntegrityError,
    CollateralWithdrawalUnavailableError,
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
    RecoveryMethodRequiredError,
    SignerRequiredError,
    throwIfCrossmintApiAuthError,
    throwIfRecoverySignerApiError,
    TransactionNotCreatedError,
    transactionNotCreatedError,
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

describe("transactionNotCreatedError", () => {
    const collateralCases = [
        { code: "COLLATERAL_FUNDS_IN_TRANSIT", errorClass: CollateralFundsInTransitError, retryable: true },
        {
            code: "COLLATERAL_FUNDING_TEMPORARILY_UNAVAILABLE",
            errorClass: CollateralFundingTemporarilyUnavailableError,
            retryable: true,
        },
        {
            code: "COLLATERAL_WITHDRAWAL_UNAVAILABLE",
            errorClass: CollateralWithdrawalUnavailableError,
            retryable: false,
        },
        {
            code: "COLLATERAL_WITHDRAWAL_INTEGRITY_ERROR",
            errorClass: CollateralWithdrawalIntegrityError,
            retryable: false,
        },
    ];

    test.each(collateralCases)("returns $errorClass.name for the $code code", ({ code, errorClass, retryable }) => {
        const body = { error: true, code, message: "from the API" };

        const error = transactionNotCreatedError(body, "Failed to send token");

        expect(error).toBeInstanceOf(errorClass);
        expect(error).toBeInstanceOf(TransactionNotCreatedError);
        expect(error.code).toBe(CrossmintErrors.NO_TRANSACTION);
        expect(error.apiErrorCode).toBe(code);
        expect(error.retryable).toBe(retryable);
        expect(error.message).toBe(`Failed to send token: ${JSON.stringify(body)}`);
        expect(error.details).toBe(JSON.stringify(body));
    });

    test("keeps an unknown API code as apiErrorCode on the base error", () => {
        const error = transactionNotCreatedError({ error: true, code: "SOMETHING_ELSE" }, "Failed to send token");

        expect(error.constructor).toBe(TransactionNotCreatedError);
        expect(error.apiErrorCode).toBe("SOMETHING_ELSE");
        expect(error.retryable).toBe(false);
    });

    test("returns the base error without apiErrorCode when the response has no code", () => {
        const error = transactionNotCreatedError({ error: true, message: "nope" }, "Failed to send token");

        expect(error.constructor).toBe(TransactionNotCreatedError);
        expect(error.apiErrorCode).toBeUndefined();
    });
});
