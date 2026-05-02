import { describe, expect, it } from "vitest";

import { redactSensitiveFields } from "./utils";

describe("redactSensitiveFields", () => {
    it("should fully redact sensitive values of 20 chars or fewer", () => {
        const input = { jwt: "12345678901234567890" };
        const result = redactSensitiveFields(input) as Record<string, unknown>;
        expect(result.jwt).toBe("[REDACTED]");
    });

    it("should show first4...last4 for sensitive values longer than 20 chars", () => {
        const input = { jwt: "abcd_secret_value_efgh" };
        const result = redactSensitiveFields(input) as Record<string, unknown>;
        expect(result.jwt).toBe("abcd...efgh");
    });

    it("should fully redact non-string sensitive values", () => {
        const input = { jwt: 12345 };
        const result = redactSensitiveFields(input) as Record<string, unknown>;
        expect(result.jwt).toBe("[REDACTED]");
    });
});
