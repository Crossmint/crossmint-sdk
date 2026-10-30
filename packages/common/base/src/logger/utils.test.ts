import { describe, expect, it } from "vitest";

import { redactSensitiveFields, redactSensitiveText } from "./utils";

const MASTER_SECRET_HEX = "0123456789abcdef".repeat(4);

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

    it("should redact server signer sensitive fields", () => {
        const input = {
            derivedKeyBytes: new Uint8Array(32),
            secretKey: new Uint8Array(64),
            keypair: { publicKey: "abc", secretKey: new Uint8Array(64) },
        };
        const result = redactSensitiveFields(input) as Record<string, unknown>;
        expect(result.derivedKeyBytes).toBe("[REDACTED]");
        expect(result.secretKey).toBe("[REDACTED]");
        expect(result.keypair).toBe("[REDACTED]");
    });

    it("should redact secret shapes embedded in an Error's message and stack", () => {
        const error = new Error(`mismatch: expected "xmsk1_${MASTER_SECRET_HEX}" but found "other"`);
        const result = redactSensitiveFields({ error }) as { error: { name: string; message: string; stack?: string } };
        expect(result.error.name).toBe("Error");
        expect(result.error.message).toBe('mismatch: expected "xmsk1_[REDACTED]" but found "other"');
        expect(result.error.stack).not.toContain(MASTER_SECRET_HEX);
        expect(result.error.stack).toContain("xmsk1_[REDACTED]");
    });

    it("should redact prefixed secret shapes inside nested string values", () => {
        const input = { details: { reason: `secret xmsk1_${MASTER_SECRET_HEX} rejected` } };
        const result = redactSensitiveFields(input) as { details: { reason: string } };
        expect(result.details.reason).toBe("secret xmsk1_[REDACTED] rejected");
    });

    it("should keep bare 64-hex structured fields such as transaction hashes", () => {
        const input = { hash: MASTER_SECRET_HEX };
        const result = redactSensitiveFields(input) as { hash: string };
        expect(result.hash).toBe(MASTER_SECRET_HEX);
    });
});

describe("redactSensitiveText", () => {
    it.each([
        ["prefixed master secret", `key xmsk1_${MASTER_SECRET_HEX} end`, "key xmsk1_[REDACTED] end"],
        ["bare 64-hex secret", `key ${MASTER_SECRET_HEX} end`, "key [REDACTED] end"],
        ["bare 64-hex secret at start of text", `${MASTER_SECRET_HEX} end`, "[REDACTED] end"],
        ["bare 64-hex secret after an underscore", `secret_${MASTER_SECRET_HEX}`, "secret_[REDACTED]"],
        ["pair of bare 64-hex secrets", `${MASTER_SECRET_HEX} ${MASTER_SECRET_HEX}`, "[REDACTED] [REDACTED]"],
        [
            "JWT",
            "token eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjM0In0.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c end",
            "token [REDACTED] end",
        ],
        [
            "quoted JWT",
            '{"jwt":"eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjM0In0.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c"}',
            '{"jwt":"[REDACTED]"}',
        ],
        ["server API key", "key sk_staging_A1b2C3d4E5f6 end", "key [REDACTED] end"],
        ["client API key", "key ck_production_A1b2C3d4E5f6 end", "key [REDACTED] end"],
        ["API key after an underscore", "my_sk_staging_A1b2C3d4E5f6", "my_[REDACTED]"],
    ])("redacts a %s in free text", (_, input, expected) => {
        expect(redactSensitiveText(input, true)).toBe(expected);
    });

    it.each([
        ["0x-prefixed transaction hash", `tx 0x${MASTER_SECRET_HEX} mined`],
        ["hex longer than a secret", `id ${MASTER_SECRET_HEX}ab done`],
        ["plain message", 'Wallet signer configuration mismatch at "email"'],
    ])("leaves a %s untouched in free text", (_, input) => {
        expect(redactSensitiveText(input, true)).toBe(input);
    });

    it("keeps bare 64-hex but still redacts prefixed shapes in structured fields", () => {
        const input = `${MASTER_SECRET_HEX} xmsk1_${MASTER_SECRET_HEX} sk_staging_A1b2C3d4E5f6`;
        expect(redactSensitiveText(input, false)).toBe(`${MASTER_SECRET_HEX} xmsk1_[REDACTED] [REDACTED]`);
    });

    it("scans adversarial look-alike text in linear time", () => {
        const text = "-eyJ".repeat(200_000);
        const startedAt = performance.now();
        redactSensitiveText(text, true);
        expect(performance.now() - startedAt).toBeLessThan(500);
    });
});
