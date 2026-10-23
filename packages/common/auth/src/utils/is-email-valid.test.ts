import { describe, expect, it } from "vitest";
import { isEmailValid } from "./isEmailValid";

describe("isEmailValid", () => {
    it("accepts ordinary valid addresses", () => {
        expect(isEmailValid("user@example.com")).toBe(true);
        expect(isEmailValid("a@b.co")).toBe(true);
    });

    it("rejects ordinary invalid addresses", () => {
        expect(isEmailValid("nope")).toBe(false);
        expect(isEmailValid("missing@dot")).toBe(false);
        expect(isEmailValid("@nodomain.com")).toBe(false);
    });

    it("accepts an otherwise valid address of exactly 254 characters", () => {
        const email = `${"a".repeat(249)}@b.co`;
        expect(email).toHaveLength(254);
        expect(isEmailValid(email)).toBe(true);
    });

    it("rejects an otherwise valid address of 255 characters", () => {
        const email = `${"a".repeat(250)}@b.co`;
        expect(email).toHaveLength(255);
        expect(isEmailValid(email)).toBe(false);
    });

    it("rejects much longer inputs without running the regex", () => {
        expect(isEmailValid(`a@${"a.".repeat(50_000)}`)).toBe(false);
    });
});
