import base58 from "bs58";
import { describe, expect, test } from "vitest";

import { validateAPIKey } from "./validateAPIKey";

if (process.env.PREVIEW_CK_KEY == null) {
    throw new Error("PREVIEW_CK_KEY must be set to run this test suite.");
}
const VALID_API_KEY = process.env.PREVIEW_CK_KEY;

describe("validateAPIKey", () => {
    // All prefix validation tests are in validateAPIKeyPrefix.test.ts
    // This test is just to make sure that validateAPIKey calls validateAPIKeyPrefix
    test("disallows when prefix is invalid", () => {
        const result = validateAPIKey("bk_");
        if (result.isValid) {
            throw new Error("Expected API key to be invalid");
        }

        expect(result.isValid).toBe(false);
    });

    test("disallows when signature is invalid", () => {
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

    test("allows when API key is valid", () => {
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
});
