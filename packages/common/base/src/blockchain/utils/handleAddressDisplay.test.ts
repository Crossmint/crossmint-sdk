import { describe, expect, test, vi } from "vitest";

vi.mock("./isValidAddress", () => ({
    isValidAddress: vi.fn(() => true),
}));

import { validateAndFormatAddress } from "./handleAddressDisplay";

describe("validateAndFormatAddress", () => {
    test("should format the address", () => {
        const addressString = "0x1234567890abcdef1234567890abcdef12345678";
        expect(validateAndFormatAddress(addressString)).toBe(
            `${addressString.slice(0, 6)}...${addressString.slice(-4)}`
        );
    });
});
