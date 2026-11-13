import { describe, expect, test } from "vitest";

import { describeVerificationError } from "./verificationErrorLog";

function basisTheoryError(name: string, fields: Record<string, unknown> = {}) {
    return Object.assign(new Error("verification failed"), { name }, fields);
}

describe("describeVerificationError", () => {
    test.each([
        ["VerificationCancelledError", "cancelled", "info"],
        ["PopupClosedError", "popup_closed", "info"],
        ["PopupBlockedError", "popup_blocked", "info"],
        ["VerificationNotSupportedError", "not_supported", "info"],
        ["CeremonyTimeoutError", "timeout", "warn"],
        ["ApiError", "api_error", "warn"],
        ["ConfigurationError", "configuration", "error"],
        ["TypeError", "unknown", "error"],
    ] as const)("classifies %s as %s at %s", (name, type, level) => {
        expect(describeVerificationError(basisTheoryError(name))).toEqual({
            level,
            context: { "error.type": type },
        });
    });

    test("classifies a thrown value that is not an Error as unknown", () => {
        expect(describeVerificationError("boom")).toEqual({ level: "error", context: { "error.type": "unknown" } });
    });

    test("keeps the Basis Theory status, error type and trace id of an ApiError", () => {
        const error = basisTheoryError("ApiError", {
            status: 422,
            type: "VERIFICATION_NOT_SUPPORTED",
            traceId: "trace_123",
            detail: "free text from Basis Theory",
        });

        expect(describeVerificationError(error).context).toEqual({
            "error.type": "api_error",
            "basisTheory.errorType": "VERIFICATION_NOT_SUPPORTED",
            "basisTheory.traceId": "trace_123",
            "http.response.status_code": 422,
        });
    });

    test("reads the identifiers of the ApiError a VerificationNotSupportedError wraps", () => {
        const error = basisTheoryError("VerificationNotSupportedError", {
            apiError: { status: 422, type: "CARD_NOT_ELIGIBLE", traceId: "trace_456" },
        });

        expect(describeVerificationError(error).context).toEqual({
            "error.type": "not_supported",
            "basisTheory.errorType": "CARD_NOT_ELIGIBLE",
            "basisTheory.traceId": "trace_456",
            "http.response.status_code": 422,
        });
    });
});
