import { afterEach, describe, expect, test, vi } from "vitest";

import { ApiClient, ApiClientError } from "./ApiClient";

class TestApiClient extends ApiClient {
    get commonHeaders(): HeadersInit {
        return {};
    }
    get baseUrl(): string {
        return "https://example.com";
    }
}

function mockResponse(status: number, body: string, contentType: string): Response {
    return new Response(body, {
        status,
        headers: { "content-type": contentType },
    });
}

describe("ApiClient makeRequest", () => {
    const client = new TestApiClient();

    afterEach(() => {
        vi.restoreAllMocks();
    });

    describe("when the response is a non-ok status with a non-JSON body", () => {
        test("throws a typed ApiClientError carrying the status and body", async () => {
            const htmlBody = "<html><body>Access denied (region blocked)</body></html>";
            vi.spyOn(globalThis, "fetch").mockResolvedValue(mockResponse(403, htmlBody, "text/html"));

            const error = await client.get("wallets/me", {}).catch((e) => e);

            expect(error).toBeInstanceOf(ApiClientError);
            expect(error.status).toBe(403);
            expect(error.responseBody).toBe(htmlBody);
        });
    });

    describe("when the response is a 5xx server error", () => {
        test("throws an ApiClientError regardless of content type", async () => {
            vi.spyOn(globalThis, "fetch").mockResolvedValue(mockResponse(502, "Bad Gateway", "text/plain"));

            const error = await client.get("wallets/me", {}).catch((e) => e);

            expect(error).toBeInstanceOf(ApiClientError);
            expect(error.status).toBe(502);
        });
    });

    describe("when the response is a non-ok status with a JSON error body", () => {
        test("passes the response through so callers can inspect the structured body", async () => {
            const jsonBody = JSON.stringify({ error: true, message: "not found" });
            vi.spyOn(globalThis, "fetch").mockResolvedValue(mockResponse(404, jsonBody, "application/json"));

            const response = await client.get("wallets/me", {});

            expect(response.status).toBe(404);
            await expect(response.json()).resolves.toEqual({ error: true, message: "not found" });
        });
    });

    describe("when the response is ok", () => {
        test("returns the response without throwing", async () => {
            const jsonBody = JSON.stringify({ address: "0x123" });
            vi.spyOn(globalThis, "fetch").mockResolvedValue(mockResponse(200, jsonBody, "application/json"));

            const response = await client.get("wallets/me", {});

            expect(response.status).toBe(200);
        });
    });
});
