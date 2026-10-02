import { describe, it, expect } from "vitest";
import { validateAndFormatTokenLabel } from "./manageTokenLabel";

describe("validateAndFormatTokenLabel", () => {
    it("should format valid labels", () => {
        expect(validateAndFormatTokenLabel("wallets")).toBe("[WALLETS]");
    });
});
