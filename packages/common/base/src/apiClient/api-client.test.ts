import { afterEach, describe, expect, test, vi } from "vitest";

import { ApiClient, ApiClientError } from "./ApiClient";

class TestApiClient extends ApiClient {
    constructor(private readonly headers: HeadersInit = {}) {
        super();
    }

    get commonHeaders(): HeadersInit {
        return this.headers;
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

    describe("when merging request headers", () => {
        const commonHeaders: Array<{ name: string; headers: HeadersInit }> = [
            { name: "record", headers: { "X-Common": "shared", "X-Mode": "common" } },
            { name: "Headers", headers: new Headers({ "X-Common": "shared", "X-Mode": "common" }) },
            {
                name: "tuples",
                headers: [
                    ["X-Common", "shared"],
                    ["X-Mode", "common"],
                ],
            },
        ];
        const requestHeaders: Array<{ name: string; headers: HeadersInit }> = [
            { name: "record", headers: { "x-mode": "request", "X-Request": "custom" } },
            { name: "Headers", headers: new Headers({ "x-mode": "request", "X-Request": "custom" }) },
            {
                name: "tuples",
                headers: [
                    ["x-mode", "request"],
                    ["X-Request", "custom"],
                ],
            },
        ];

        for (const common of commonHeaders) {
            for (const request of requestHeaders) {
                test(`preserves ${common.name} defaults and applies ${request.name} overrides case-insensitively`, async () => {
                    const fetchSpy = vi
                        .spyOn(globalThis, "fetch")
                        .mockResolvedValue(mockResponse(200, "{}", "application/json"));

                    await new TestApiClient(common.headers).get("items", { headers: request.headers });

                    const headers = new Headers(fetchSpy.mock.calls[0][1]?.headers);
                    expect(headers.get("x-common")).toBe("shared");
                    expect(headers.get("x-mode")).toBe("request");
                    expect(headers.get("x-request")).toBe("custom");
                    expect(headers.has("0")).toBe(false);
                    expect(new Headers(common.headers).get("x-mode")).toBe("common");
                    expect(new Headers(request.headers).has("x-common")).toBe(false);
                });
            }
        }

        test("preserves common headers when request headers are omitted", async () => {
            const fetchSpy = vi
                .spyOn(globalThis, "fetch")
                .mockResolvedValue(mockResponse(200, "{}", "application/json"));

            await new TestApiClient(new Headers({ "X-Common": "shared" })).get("items", {});

            expect(new Headers(fetchSpy.mock.calls[0][1]?.headers).get("x-common")).toBe("shared");
        });
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
