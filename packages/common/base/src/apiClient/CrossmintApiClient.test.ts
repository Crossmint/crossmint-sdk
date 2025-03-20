import { describe, expect, test } from "vitest";
import { CrossmintApiClient } from "./CrossmintApiClient";
import { environmentToCrossmintBaseURL } from "../apiKey/utils/environmentToCrossmintBaseURL";

const VALID_API_KEY =
    "ck_development_A61UZQnvjSQcM5qVBaBactgqebxafWAVsNdD2xLkgBxoYuH5q2guM8r9DUmZQzE1WYyoByGVYpEG2o9gVSzAZFsrLbfKGERUJ6D5CW6S9AsJGAc3ctgrsD4n2ioekzGj7KPbLwT3SysDjMamYXLxEroUbQSdwf6aLF4zeEpECq2crkTUQeLFzxzmjWNxFDHFYefDrfrFPCURvBXJLf5pCxCQ";

describe("CrossmintApiClient", () => {
    const internalConfig = {
        sdkMetadata: {
            name: "test-sdk",
            version: "1.0.0",
        },
    };

    test("should throw error when API key is invalid", () => {
        expect(() => {
            new CrossmintApiClient(
                { apiKey: "invalid-key" },
                { internalConfig }
            );
        }).toThrow("Malformed API key. Must start with 'ck' or 'sk'.");
    });

    test("should throw error when API key has wrong environment", () => {
        expect(() => {
            new CrossmintApiClient(
                { apiKey: VALID_API_KEY },
                {
                    internalConfig: {
                        ...internalConfig,
                        apiKeyExpectations: { environment: "production" },
                    },
                }
            );
        }).toThrow("Disallowed API key. You passed a development API key, but a production API key is required.");
    });

    test("should throw error when API key has wrong usage origin", () => {
        expect(() => {
            new CrossmintApiClient(
                { apiKey: VALID_API_KEY },
                {
                    internalConfig: {
                        ...internalConfig,
                        apiKeyExpectations: { usageOrigin: "server" },
                    },
                }
            );
        }).toThrow("Disallowed API key. You passed a client API key, but a server API key is required.");
    });

    test("should initialize with valid API key", () => {
        const client = new CrossmintApiClient(
            { apiKey: VALID_API_KEY },
            { internalConfig }
        );

        expect(client.environment).toBe("development");
        expect(client.baseUrl).toBe(environmentToCrossmintBaseURL("development"));
        expect(client.authHeaders).toEqual({
            "x-api-key": VALID_API_KEY,
        });
    });

    test("should use override base URL when provided", () => {
        const overrideUrl = "https://custom-api.example.com";
        const client = new CrossmintApiClient(
            { apiKey: VALID_API_KEY, overrideBaseUrl: overrideUrl },
            { internalConfig }
        );

        expect(client.baseUrl).toBe(overrideUrl);
    });

    test("should include JWT in auth headers when provided", () => {
        const jwt = "test.jwt.token";
        const client = new CrossmintApiClient(
            { apiKey: VALID_API_KEY, jwt },
            { internalConfig }
        );

        expect(client.authHeaders).toEqual({
            "x-api-key": VALID_API_KEY,
            Authorization: `Bearer ${jwt}`,
        });
    });

    test("should handle different environments correctly", () => {
        const environments = ["development", "staging", "production"] as const;
        
        for (const env of environments) {
            expect(() => {
                new CrossmintApiClient(
                    { apiKey: `ck_${env}_5KtPn3` },
                    { internalConfig }
                );
            }).toThrow("Invalid API key. Failed to validate signature");
        }
    });
}); 