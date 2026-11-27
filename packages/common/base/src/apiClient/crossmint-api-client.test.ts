import { afterEach, describe, expect, test, vi } from "vitest";

import type { Crossmint } from "@/types/Crossmint";

import { CrossmintApiClient } from "./CrossmintApiClient";

const apiKey = vi.hoisted(() => ({ environment: "staging" }));

vi.mock("@/apiKey/validateAPIKey", () => ({
    validateAPIKey: () => ({
        isValid: true,
        projectId: "project-id",
        usageOrigin: "client",
        environment: apiKey.environment,
        prefix: `ck_${apiKey.environment}`,
    }),
}));

const SDK_METADATA = { name: "@crossmint/test-sdk", version: "1.2.3" };

function clientFor(config: Partial<Crossmint>): CrossmintApiClient {
    const crossmint = { apiKey: "ck_staging_test", setJwt: vi.fn(), ...config } as Crossmint;
    return new CrossmintApiClient(crossmint, { internalConfig: { sdkMetadata: SDK_METADATA } });
}

async function headersSentBy(client: CrossmintApiClient): Promise<Headers> {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response("{}", { status: 200 }));
    await client.get("wallets/me", {});
    return new Headers(fetchSpy.mock.calls[0][1]?.headers);
}

async function urlRequestedBy(client: CrossmintApiClient): Promise<string> {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response("{}", { status: 200 }));
    await client.get("wallets/me", {});
    return fetchSpy.mock.calls[0][0] as string;
}

describe("CrossmintApiClient", () => {
    afterEach(() => {
        vi.restoreAllMocks();
        apiKey.environment = "staging";
    });

    describe("request headers", () => {
        test("identify the SDK and carry the API key on every request", async () => {
            const headers = await headersSentBy(clientFor({}));

            expect(headers.get("x-api-key")).toBe("ck_staging_test");
            expect(headers.get("x-client-name")).toBe(SDK_METADATA.name);
            expect(headers.get("x-client-version")).toBe(SDK_METADATA.version);
        });

        test("omit app, extension and authorization headers when none are configured", async () => {
            const headers = await headersSentBy(clientFor({}));

            expect(headers.has("x-app-identifier")).toBe(false);
            expect(headers.has("x-extension-id")).toBe(false);
            expect(headers.has("Authorization")).toBe(false);
        });

        test("carry the app and extension identifiers when configured", async () => {
            const headers = await headersSentBy(clientFor({ appId: "app-1", extensionId: "ext-1" }));

            expect(headers.get("x-app-identifier")).toBe("app-1");
            expect(headers.get("x-extension-id")).toBe("ext-1");
        });

        test("send the JWT as a bearer token", async () => {
            const headers = await headersSentBy(clientFor({ jwt: "jwt-123" }));

            expect(headers.get("Authorization")).toBe("Bearer jwt-123");
        });

        test("let a per-request header override the common one", async () => {
            const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response("{}", { status: 200 }));

            await clientFor({}).get("wallets/me", { headers: { "x-client-name": "override" } });

            const headers = new Headers(fetchSpy.mock.calls[0][1]?.headers);
            expect(headers.get("x-client-name")).toBe("override");
        });
    });

    describe("base URL", () => {
        test.each([
            ["development", "http://localhost:3000/wallets/me"],
            ["staging", "https://staging.crossmint.com/wallets/me"],
            ["production", "https://www.crossmint.com/wallets/me"],
        ])("is derived from the API key's environment (%s)", async (environment, expected) => {
            apiKey.environment = environment;

            expect(await urlRequestedBy(clientFor({}))).toBe(expected);
        });

        test("prefers overrideBaseUrl over the environment, with its trailing slash normalised", async () => {
            const url = await urlRequestedBy(clientFor({ overrideBaseUrl: "https://preview.example.com/" }));

            expect(url).toBe("https://preview.example.com/wallets/me");
        });
    });
});
