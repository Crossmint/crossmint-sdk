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

    it("redacts secret shapes embedded in an Error's message and stack", () => {
        const error = new Error(`mismatch: expected "xmsk1_${MASTER_SECRET_HEX}" but found "other"`);
        const result = redactSensitiveFields({ error }) as { error: { name: string; message: string; stack?: string } };
        expect(result.error.name).toBe("Error");
        expect(result.error.message).toBe('mismatch: expected "xmsk1_[REDACTED]" but found "other"');
        expect(result.error.stack).not.toContain(MASTER_SECRET_HEX);
        expect(result.error.stack).toContain("xmsk1_[REDACTED]");
    });

    it("redacts prefixed secret shapes inside nested string values", () => {
        const input = { details: { reason: `secret xmsk1_${MASTER_SECRET_HEX} rejected` } };
        const result = redactSensitiveFields(input) as { details: { reason: string } };
        expect(result.details.reason).toBe("secret xmsk1_[REDACTED] rejected");
    });

    it("keeps bare 64-hex structured fields such as transaction hashes", () => {
        const input = { hash: MASTER_SECRET_HEX };
        const result = redactSensitiveFields(input) as { hash: string };
        expect(result.hash).toBe(MASTER_SECRET_HEX);
    });

    it("redacts bare 64-hex secrets inside message and stack fields of a serialized error", () => {
        const input = {
            error: { name: "Error", message: `rejected ${MASTER_SECRET_HEX}`, stack: `at ${MASTER_SECRET_HEX}` },
        };
        const result = redactSensitiveFields(input) as { error: { message: string; stack: string } };
        expect(result.error.message).toBe("rejected [REDACTED]");
        expect(result.error.stack).toBe("at [REDACTED]");
    });

    it.each([
        ["camelCase secret", { serverSecret: MASTER_SECRET_HEX }, { serverSecret: "0123...cdef" }],
        ["snake_case secret", { master_secret: MASTER_SECRET_HEX }, { master_secret: "0123...cdef" }],
        ["private key variant", { privateKeyHex: `0x${MASTER_SECRET_HEX}` }, { privateKeyHex: "0x01...cdef" }],
        [
            "kebab-case upper-case seed",
            { "WALLET-SEED": new Uint8Array([200, 201, 202]) },
            { "WALLET-SEED": "[REDACTED]" },
        ],
        ["mnemonic", { mnemonic: "abandon ability able about above absent" }, { mnemonic: "aban...sent" }],
        ["createServerSigner key bytes", { keyBytes: new Uint8Array([200, 201, 202]) }, { keyBytes: "[REDACTED]" }],
        // No known secret shape in these values: only key normalization can redact them.
        ["kebab-case API key header", { "x-api-key": "pk_live_51HqT9xY2zR8mN3" }, { "x-api-key": "pk_l...8mN3" }],
        ["snake_case token", { refresh_token: "rt_8f3Kq2LmZx91VbN4" }, { refresh_token: "[REDACTED]" }],
    ])("redacts a %s key", (_, input, expected) => {
        expect(redactSensitiveFields(input)).toEqual(expected);
    });

    it("keeps public key bytes readable", () => {
        expect(redactSensitiveFields({ publicKeyBytes: [4, 17, 99] })).toEqual({ publicKeyBytes: [4, 17, 99] });
    });

    const nestIn = (levels: number, inner: unknown): unknown =>
        levels === 0 ? inner : { level: nestIn(levels - 1, inner) };

    it.each([
        ["keeps an object at the depth limit", 10, { note: "kept" }, nestIn(10, { note: "kept" })],
        ["truncates an object past the depth limit", 11, { note: "dropped" }, nestIn(11, "[TRUNCATED]")],
    ])("%s", (_, levels, inner, expected) => {
        expect(redactSensitiveFields(nestIn(levels, inner))).toEqual(expected);
    });
});

describe("redactSensitiveFields with personal data", () => {
    it.each([
        ["email recipient", { recipient: "email:alice@example.com" }, { recipient: "email:a***@example.com" }],
        ["phone recipient", { recipient: "phoneNumber:+15551234567" }, { recipient: "phoneNumber:+1***4567" }],
        ["phone signer locator", { signerLocator: "phone:+447911123456" }, { signerLocator: "phone:+4***3456" }],
        [
            "email wallet locator",
            { locator: "email:alice@example.com:evm-smart-wallet" },
            { locator: "email:a***@example.com:evm-smart-wallet" },
        ],
        [
            "email and phone fields of a signer response",
            { response: { type: "phone", phone: "+15551234567", email: "bob@example.co.uk" } },
            { response: { type: "phone", phone: "+1***4567", email: "b***@example.co.uk" } },
        ],
        [
            "email with an apostrophe",
            { recipient: "email:o'brien@example.com" },
            { recipient: "email:o***@example.com" },
        ],
        [
            "email with a quoted local part",
            { recipient: 'email:"john.doe"@example.com' },
            { recipient: "email:***@example.com" },
        ],
        [
            "email with an escaped quote in a quoted local part",
            { recipient: 'email:"john\\"doe"@example.com' },
            { recipient: "email:***@example.com" },
        ],
        ["phone field that is not a plain number", { phoneNumber: "+1 555 123 4567" }, { phoneNumber: "[REDACTED]" }],
    ])("masks an %s", (_, input, expected) => {
        expect(redactSensitiveFields(input)).toEqual(expected);
    });

    it("masks an email inside an Error's message", () => {
        const result = redactSensitiveFields({ error: new Error("no wallet for alice@example.com") }) as {
            error: { message: string };
        };
        expect(result.error.message).toBe("no wallet for a***@example.com");
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
        ["package specifier with a version", "loaded @crossmint/wallets-sdk@1.2.3"],
        ["short phone locator", "phone:+1234"],
    ])("leaves a %s untouched in free text", (_, input) => {
        expect(redactSensitiveText(input, true)).toBe(input);
    });

    it("keeps bare 64-hex but still redacts prefixed shapes in structured fields", () => {
        const input = `${MASTER_SECRET_HEX} xmsk1_${MASTER_SECRET_HEX} sk_staging_A1b2C3d4E5f6`;
        expect(redactSensitiveText(input, false)).toBe(`${MASTER_SECRET_HEX} xmsk1_[REDACTED] [REDACTED]`);
    });

    it("scans adversarial look-alike text in linear time", () => {
        // Linear scanning takes a few milliseconds; the quadratic pattern this guards against took
        // tens of seconds, so the bound is loose enough for a loaded CI runner.
        const text = `${"-eyJ".repeat(200_000)} a@${"a.".repeat(200_000)} ${"phone:1".repeat(200_000)} ${' "a'.repeat(200_000)} ${'\\"a'.repeat(200_000)}`;
        const startedAt = performance.now();
        redactSensitiveText(text, true);
        expect(performance.now() - startedAt).toBeLessThan(5_000);
    });
});
