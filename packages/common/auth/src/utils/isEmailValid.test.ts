import { describe, expect, it } from "vitest";
import { isEmailValid } from "./isEmailValid";

describe("isEmailValid", () => {
    it("should return true for valid email addresses", () => {
        expect(isEmailValid("test@example.com")).toBe(true);
        expect(isEmailValid("user.name@example.com")).toBe(true);
        expect(isEmailValid("user+tag@example.com")).toBe(true);
        expect(isEmailValid("user@sub.domain.example.com")).toBe(true);
        expect(isEmailValid("123@example.com")).toBe(true);
        expect(isEmailValid("user@example.co.uk")).toBe(true);
    });

    it("should return false for invalid email addresses", () => {
        expect(isEmailValid("")).toBe(false);
        expect(isEmailValid("test")).toBe(false);
        expect(isEmailValid("test@")).toBe(false);
        expect(isEmailValid("@example.com")).toBe(false);
        expect(isEmailValid("test@example")).toBe(false);
        expect(isEmailValid("test@.com")).toBe(false);
        expect(isEmailValid("test@example.")).toBe(false);
        expect(isEmailValid("test@exam ple.com")).toBe(false);
        expect(isEmailValid(" test@example.com")).toBe(false);
        expect(isEmailValid("test@example.com ")).toBe(false);
    });

    it("should handle edge cases correctly", () => {
        expect(isEmailValid("a@b.c")).toBe(true); // Minimal valid email
        expect(isEmailValid("test@localhost")).toBe(false); // Missing TLD
        expect(isEmailValid("test.example.com")).toBe(false); // Missing @ symbol
        expect(isEmailValid("test@@example.com")).toBe(false); // Double @ symbol
    });
}); 