import base58 from "bs58";
import { describe, expect, test } from "vitest";

import { validateAPIKey } from "./validateAPIKey";

const VALID_API_KEY =
    "ck_development_A61UZQnvjSQcM5qVBaBactgqebxafWAVsNdD2xLkgBxoYuH5q2guM8r9DUmZQzE1WYyoByGVYpEG2o9gVSzAZFsrLbfKGERUJ6D5CW6S9AsJGAc3ctgrsD4n2ioekzGj7KPbLwT3SysDjMamYXLxEroUbQSdwf6aLF4zeEpECq2crkTUQeLFzxzmjWNxFDHFYefDrfrFPCURvBXJLf5pCxCQ";

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

    describe("when the signature of a valid key is tampered with", () => {
        const PREFIX = "ck_development_";
        const [keyData, signature] = new TextDecoder()
            .decode(base58.decode(VALID_API_KEY.slice(PREFIX.length)))
            .split(":");

        function keyWithSignature(signatureBytes: Uint8Array) {
            const decoded = `${keyData}:${base58.encode(signatureBytes)}`;
            return `${PREFIX}${base58.encode(new TextEncoder().encode(decoded))}`;
        }

        test("rejects a signature with one flipped bit", () => {
            const tampered = base58.decode(signature);
            tampered[10] ^= 0x01;

            const result = validateAPIKey(keyWithSignature(tampered));

            expect(result.isValid).toBe(false);
        });

        test("rejects a truncated signature", () => {
            const result = validateAPIKey(keyWithSignature(base58.decode(signature).slice(0, 63)));

            expect(result.isValid).toBe(false);
        });

        test("rejects an all-zero signature", () => {
            const result = validateAPIKey(keyWithSignature(new Uint8Array(64)));

            expect(result.isValid).toBe(false);
        });
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
