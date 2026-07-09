import { CrossmintErrors } from "@crossmint/common-sdk-base";
import { describe, expect, test } from "vitest";

import {
    JWTDecryptionError,
    JWTExpiredError,
    JWTIdentifierError,
    JWTInvalidError,
    NotAuthorizedError,
    throwIfCrossmintApiAuthError,
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
