import { describe, expect, test } from "vitest";

import { validateAPIKeyPrefix } from "./validateAPIKeyPrefix";

describe("validateAPIKeyPrefix", () => {
    test("Should disallow API keys with old format", () => {
        const prefixes = ["sk_live", "sk_test"];

        for (const prefix of prefixes) {
            const result = validateAPIKeyPrefix(prefix);
            if (result.isValid) {
                throw new Error("Expected API key to be invalid");
            }

            expect(result.isValid).toBe(false);
            expect(result.message).toBe(
                "Old API key format detected. Please create a new API key from the Crossmint console."
            );
        }
    });

    test("Should disallow when usage prefix is invalid", () => {
        const result = validateAPIKeyPrefix("bk_");
        if (result.isValid) {
            throw new Error("Expected API key to be invalid");
        }

        expect(result.isValid).toBe(false);
        expect(result.message).toBe("Malformed API key. Must start with 'ck' or 'sk'.");
    });

    test("Should disallow when API key does not have expected usage origin", () => {
        const clientDevKey = "ck_development";
        const result1 = validateAPIKeyPrefix(clientDevKey, { usageOrigin: "server" });
        if (result1.isValid) {
            throw new Error("Expected API key to be invalid");
        }
        expect(result1.isValid).toBe(false);
        expect(result1.message).toBe(
            `Disallowed API key. You passed a ${"client"} API key, but a ${"server"} API key is required.`
        );

        const serverDevKey = "sk_development";
        const result = validateAPIKeyPrefix(serverDevKey, { usageOrigin: "client" });
        if (result.isValid) {
            throw new Error("Expected API key to be invalid");
        }
        expect(result.isValid).toBe(false);
        expect(result.message).toBe(
            `Disallowed API key. You passed a ${"server"} API key, but a ${"client"} API key is required.`
        );
    });

    test("Should disallow when environment prefix is invalid", () => {
        const prefixes = ["ck_badenv", "sk_random"];

        for (const prefix of prefixes) {
            const result = validateAPIKeyPrefix(prefix);
            if (result.isValid) {
                throw new Error("Expected API key to be invalid");
            }

            expect(result.isValid).toBe(false);
            expect(result.message).toBe(
                "Malformed API key. Must have a valid environment: 'development', 'staging' or 'production'."
            );
        }
    });

    test("Should disallow when API key does not have expected environment", () => {
        const key = "ck_development_2EwmxKnPjzbvK";

        const result = validateAPIKeyPrefix(key, { environment: "production" });
        if (result.isValid) {
            throw new Error("Expected API key to be invalid");
        }

        expect(result.isValid).toBe(false);
        expect(result.message).toBe(
            `Disallowed API key. You passed a development API key, but a production API key is required.`
        );
    });

    test("Should allow correctly formatted API key", () => {
        const usageOriginPrefixes = ["ck", "sk"];
        const environmentPrefixes = ["development", "staging", "production"];

        const keys = usageOriginPrefixes.flatMap((usageOriginPrefix) =>
            environmentPrefixes.map((environmentPrefix) => `${usageOriginPrefix}_${environmentPrefix}_2EwmxKnPjzbvK`)
        );

        for (const key of keys) {
            const result = validateAPIKeyPrefix(key);
            if (!result.isValid) {
                throw new Error("Expected API key to be valid");
            }

            expect(result.isValid).toBe(true);
            expect(result.usageOrigin).toBe(key.startsWith("ck") ? "client" : "server");
            expect(result.environment).toBe(key.split("_")[1]);
            expect(result.prefix).toBe(key.split("_").slice(0, 2).join("_"));
        }
    });

    test("Should allow when API key has expected usage origin and environment", () => {
        const key = "ck_development_2EwmxKnPjzbvK";

        const result = validateAPIKeyPrefix(key, { usageOrigin: "client", environment: "development" });
        if (!result.isValid) {
            throw new Error("Expected API key to be valid");
        }

        expect(result.isValid).toBe(true);
        expect(result.usageOrigin).toBe("client");
        expect(result.environment).toBe("development");
        expect(result.prefix).toBe("ck_development");
    });
});
