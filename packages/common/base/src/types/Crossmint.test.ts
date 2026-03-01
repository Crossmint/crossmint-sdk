import { describe, expect, test } from "vitest";
import { createCrossmint } from "./Crossmint";

const VALID_API_KEY =
    "ck_development_A61UZQnvjSQcM5qVBaBactgqebxafWAVsNdD2xLkgBxoYuH5q2guM8r9DUmZQzE1WYyoByGVYpEG2o9gVSzAZFsrLbfKGERUJ6D5CW6S9AsJGAc3ctgrsD4n2ioekzGj7KPbLwT3SysDjMamYXLxEroUbQSdwf6aLF4zeEpECq2crkTUQeLFzxzmjWNxFDHFYefDrfrFPCURvBXJLf5pCxCQ";

describe("createCrossmint", () => {
    test("should create Crossmint instance with valid API key", () => {
        const config = { apiKey: VALID_API_KEY };
        const result = createCrossmint(config);

        expect(result).toEqual({
            apiKey: VALID_API_KEY,
        });
    });

    test("should create Crossmint instance with JWT", () => {
        const jwt = "test.jwt.token";
        const config = { apiKey: VALID_API_KEY, jwt };
        const result = createCrossmint(config);

        expect(result).toEqual({
            apiKey: VALID_API_KEY,
            jwt,
        });
    });

    test("should create Crossmint instance with override base URL", () => {
        const overrideBaseUrl = "https://custom-api.example.com";
        const config = { apiKey: VALID_API_KEY, overrideBaseUrl };
        const result = createCrossmint(config);

        expect(result).toEqual({
            apiKey: VALID_API_KEY,
            overrideBaseUrl,
        });
    });

    test("should create Crossmint instance with all optional parameters", () => {
        const jwt = "test.jwt.token";
        const overrideBaseUrl = "https://custom-api.example.com";
        const config = { apiKey: VALID_API_KEY, jwt, overrideBaseUrl };
        const result = createCrossmint(config);

        expect(result).toEqual({
            apiKey: VALID_API_KEY,
            jwt,
            overrideBaseUrl,
        });
    });

    test("should throw error for invalid API key", () => {
        const config = { apiKey: "invalid-key" };
        expect(() => createCrossmint(config)).toThrow("Malformed API key. Must start with 'ck' or 'sk'.");
    });

    test("should validate API key with expectations", () => {
        const config = { apiKey: VALID_API_KEY };
        const apiKeyExpectations = { environment: "production" };
        expect(() => createCrossmint(config, apiKeyExpectations)).toThrow(
            "Disallowed API key. You passed a development API key, but a production API key is required."
        );
    });

    test("should handle undefined API key", () => {
        const config = { apiKey: undefined } as any;
        expect(() => createCrossmint(config)).toThrow("Cannot read properties of undefined");
    });

    test("should handle invalid API key", () => {
        const config = { apiKey: "abc" } as any;
        expect(() => createCrossmint(config)).toThrow("Malformed API key. Must start with 'ck' or 'sk'.");
    });
}); 