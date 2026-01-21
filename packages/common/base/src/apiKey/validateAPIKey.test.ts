import base58 from "bs58";
import { describe, expect, test } from "vitest";

import { validateAPIKey } from "./validateAPIKey";

const VALID_API_KEY =
    "ck_development_A61UZQnvjSQcM5qVBaBactgqebxafWAVsNdD2xLkgBxoYuH5q2guM8r9DUmZQzE1WYyoByGVYpEG2o9gVSzAZFsrLbfKGERUJ6D5CW6S9AsJGAc3ctgrsD4n2ioekzGj7KPbLwT3SysDjMamYXLxEroUbQSdwf6aLF4zeEpECq2crkTUQeLFzxzmjWNxFDHFYefDrfrFPCURvBXJLf5pCxCQ";

describe("validateAPIKey", () => {
    // All prefix validation tests are in validateAPIKeyPrefix.test.ts
    // This test is just to make sure that validateAPIKey calls validateAPIKeyPrefix
    test("Should disallow when prefix is invalid", () => {
        const result = validateAPIKey("bk_");
        if (result.isValid) {
            throw new Error("Expected API key to be invalid");
        }

        expect(result.isValid).toBe(false);
        expect(result.message).toBe("Malformed API key. Must start with 'ck' or 'sk'.");
    });

    test("Should disallow when signature is invalid", () => {
        const key = `ck_development_${base58.encode(
            new TextEncoder().encode(
                "incorrect_data:5gt3DJTWBAw1AjL5pHo6z6NunHZNJqj15iEAveVN5CBUSqBB94Hetn9paFpx9zLFreQGAgy1TkDQaWSUXFMXjgvU"
            )
        )}`;

        const result = validateAPIKey(key);
        if (result.isValid) {
            throw new Error("Expected API key to be invalid");
        }

        expect(result.isValid).toBe(false);
        expect(result.message).toBe("Invalid API key. Failed to validate signature");
    });

    test("Should allow when API key is valid", () => {
        const result = validateAPIKey(VALID_API_KEY);
        if (!result.isValid) {
            throw new Error("Expected API key to be valid");
        }

        expect(result.isValid).toBe(true);
        expect(result.projectId).toBe("dfb06708-a46f-4615-bd34-f614ae284e7b");
        expect(result.usageOrigin).toBe("client");
        expect(result.environment).toBe("development");
        expect(result.prefix).toBe("ck_development");
    });

    // Additional edge cases
    test("Should disallow empty API key", () => {
        const result = validateAPIKey("");
        expect(result.isValid).toBe(false);
        if (!result.isValid) {
            expect(result.message).toBe("Malformed API key. Must start with 'ck' or 'sk'.");
        }
    });

    test("Should disallow API key with invalid base58 encoding", () => {
        const result = validateAPIKey("ck_development_5KtPn3");
        expect(result.isValid).toBe(false);
        if (!result.isValid) {
            expect(result.message).toBe("Invalid API key. Failed to validate signature");
        }
    });

    test("Should disallow API key with malformed data format", () => {
        const malformedData = base58.encode(new TextEncoder().encode("invalid_format"));
        const result = validateAPIKey(`ck_development_${malformedData}`);
        expect(result.isValid).toBe(false);
        if (!result.isValid) {
            expect(result.message).toBe("Invalid API key. Failed to validate signature");
        }
    });

    test("Should disallow API key with missing project ID", () => {
        const malformedData = base58.encode(new TextEncoder().encode(":5gt3DJTWBAw1AjL5pHo6z6NunHZNJqj15iEAveVN5CBUSqBB94Hetn9paFpx9zLFreQGAgy1TkDQaWSUXFMXjgvU"));
        const result = validateAPIKey(`ck_development_${malformedData}`);
        expect(result.isValid).toBe(false);
        if (!result.isValid) {
            expect(result.message).toBe("Invalid API key. Failed to validate signature");
        }
    });

    test("Should disallow API key with invalid project ID format", () => {
        const malformedData = base58.encode(new TextEncoder().encode("not-a-uuid:5gt3DJTWBAw1AjL5pHo6z6NunHZNJqj15iEAveVN5CBUSqBB94Hetn9paFpx9zLFreQGAgy1TkDQaWSUXFMXjgvU"));
        const result = validateAPIKey(`ck_development_${malformedData}`);
        expect(result.isValid).toBe(false);
        if (!result.isValid) {
            expect(result.message).toBe("Invalid API key. Failed to validate signature");
        }
    });

    test("Should handle API key with maximum length", () => {
        const longData = "a".repeat(1000);
        const result = validateAPIKey(`ck_development_${base58.encode(new TextEncoder().encode(longData))}`);
        expect(result.isValid).toBe(false);
        if (!result.isValid) {
            expect(result.message).toBe("Invalid API key. Failed to validate signature");
        }
    });
});
