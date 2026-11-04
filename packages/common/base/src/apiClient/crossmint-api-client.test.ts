import { afterEach, describe, expect, test, vi } from "vitest";

import type { Crossmint } from "@/types/Crossmint";

import { CrossmintApiClient } from "./CrossmintApiClient";

vi.mock("@/apiKey/validateAPIKey", () => ({
    validateAPIKey: () => ({
        isValid: true,
        projectId: "project-id",
        usageOrigin: "client",
        environment: "staging",
        prefix: "ck_staging",
    }),
}));

const SDK_METADATA = { name: "@crossmint/test-sdk", version: "1.2.3" };

function clientFor(config: Partial<Crossmint>): CrossmintApiClient {
    const crossmint = { apiKey: "ck_staging_test", setJwt: vi.fn(), ...config } as Crossmint;
    return new CrossmintApiClient(crossmint, { internalConfig: { sdkMetadata: SDK_METADATA } });
}

async function headersSentBy(client: CrossmintApiClient): Promise<Record<string, string>> {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response("{}", { status: 200 }));
    await client.get("wallets/me", {});
    return fetchSpy.mock.calls[0][1]?.headers as Record<string, string>;
}

async function urlRequestedBy(client: CrossmintApiClient): Promise<string> {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response("{}", { status: 200 }));
    await client.get("wallets/me", {});
    return fetchSpy.mock.calls[0][0] as string;
}

describe("CrossmintApiClient", () => {
    afterEach(() => {
        vi.restoreAllMocks();
    });

    describe("request headers", () => {
        test("identify the SDK and carry the API key on every request", async () => {
            const headers = await headersSentBy(clientFor({}));

            expect(headers["x-api-key"]).toBe("ck_staging_test");
            expect(headers["x-client-name"]).toBe(SDK_METADATA.name);
            expect(headers["x-client-version"]).toBe(SDK_METADATA.version);
        });

        test("omit app, extension and authorization headers when none are configured", async () => {
            const headers = await headersSentBy(clientFor({}));

            expect(headers).not.toHaveProperty("x-app-identifier");
            expect(headers).not.toHaveProperty("x-extension-id");
            expect(headers).not.toHaveProperty("Authorization");
        });

        test("carry the app and extension identifiers when configured", async () => {
            const headers = await headersSentBy(clientFor({ appId: "app-1", extensionId: "ext-1" }));

            expect(headers["x-app-identifier"]).toBe("app-1");
            expect(headers["x-extension-id"]).toBe("ext-1");
        });

        test("send the JWT as a bearer token", async () => {
            const headers = await headersSentBy(clientFor({ jwt: "jwt-123" }));

            expect(headers.Authorization).toBe("Bearer jwt-123");
        });

        test("let a per-request header override the common one", async () => {
            const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response("{}", { status: 200 }));

            await clientFor({}).get("wallets/me", { headers: { "x-client-name": "override" } });

            const headers = fetchSpy.mock.calls[0][1]?.headers as Record<string, string>;
            expect(headers["x-client-name"]).toBe("override");
        });
    });

    describe("base URL", () => {
        test("is derived from the API key's environment", async () => {
            expect(await urlRequestedBy(clientFor({}))).toBe("https://staging.crossmint.com/wallets/me");
        });

        test("prefers overrideBaseUrl over the environment, with its trailing slash normalised", async () => {
            const url = await urlRequestedBy(clientFor({ overrideBaseUrl: "https://preview.example.com/" }));

            expect(url).toBe("https://preview.example.com/wallets/me");
        });
    });
});
