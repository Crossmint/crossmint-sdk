import { afterEach, describe, expect, it, vi } from "vitest";
import { ApiClient, ApiClientError, ApiRequestTimeoutError } from "./ApiClient";

class TestApiClient extends ApiClient {
    get commonHeaders(): HeadersInit {
        return { "x-test": "true" };
    }
    get baseUrl(): string {
        return "https://api.example.com";
    }

    // Expose makeRequest indirectly through the public HTTP methods
}

describe("ApiClient - timeout handling", () => {
    const originalFetch = globalThis.fetch;

    afterEach(() => {
        globalThis.fetch = originalFetch;
        vi.restoreAllMocks();
    });

    it("should reject with ApiRequestTimeoutError when fetch times out", async () => {
        const timeoutError = new DOMException("The operation was aborted due to timeout", "TimeoutError");
        globalThis.fetch = vi.fn().mockRejectedValue(timeoutError);

        const client = new TestApiClient();

        await expect(client.get("/slow-endpoint", {})).rejects.toThrow(ApiRequestTimeoutError);
        await expect(client.get("/slow-endpoint", {})).rejects.toThrow('API request to "/slow-endpoint" timed out');
    });

    it("should include the path in the ApiRequestTimeoutError", async () => {
        const timeoutError = new DOMException("The operation was aborted due to timeout", "TimeoutError");
        globalThis.fetch = vi.fn().mockRejectedValue(timeoutError);

        const client = new TestApiClient();

        try {
            await client.get("/my/custom/path", {});
            expect.fail("Expected ApiRequestTimeoutError");
        } catch (error) {
            expect(error).toBeInstanceOf(ApiRequestTimeoutError);
            expect((error as ApiRequestTimeoutError).path).toBe("/my/custom/path");
        }
    });

    it("should use caller-supplied signal instead of the default timeout", async () => {
        const mockResponse = new Response(JSON.stringify({ ok: true }), { status: 200 });
        globalThis.fetch = vi.fn().mockResolvedValue(mockResponse);

        const client = new TestApiClient();
        const customController = new AbortController();

        await client.get("/endpoint", { signal: customController.signal });

        expect(globalThis.fetch).toHaveBeenCalledWith(
            expect.any(String),
            expect.objectContaining({
                signal: customController.signal,
            })
        );
    });

    it("should apply a default AbortSignal.timeout(30_000) when no signal is provided", async () => {
        const timeoutSpy = vi.spyOn(AbortSignal, "timeout");
        const mockResponse = new Response(JSON.stringify({ ok: true }), { status: 200 });
        globalThis.fetch = vi.fn().mockResolvedValue(mockResponse);

        const client = new TestApiClient();
        await client.get("/endpoint", {});

        expect(timeoutSpy).toHaveBeenCalledWith(30_000);
    });

    it("should re-throw non-timeout errors as-is", async () => {
        const networkError = new Error("Network failure");
        globalThis.fetch = vi.fn().mockRejectedValue(networkError);

        const client = new TestApiClient();

        await expect(client.get("/endpoint", {})).rejects.toThrow("Network failure");
        await expect(client.get("/endpoint", {})).rejects.not.toBeInstanceOf(ApiRequestTimeoutError);
    });

    it("should re-throw non-timeout DOMExceptions as-is", async () => {
        const abortError = new DOMException("The operation was aborted", "AbortError");
        globalThis.fetch = vi.fn().mockRejectedValue(abortError);

        const client = new TestApiClient();

        await expect(client.get("/endpoint", {})).rejects.toThrow(DOMException);
        await expect(client.get("/endpoint", {})).rejects.not.toBeInstanceOf(ApiRequestTimeoutError);
    });

    it("should still throw ApiClientError on 5xx responses", async () => {
        const mockResponse = new Response("Internal Server Error", {
            status: 500,
            statusText: "Internal Server Error",
        });
        globalThis.fetch = vi.fn().mockResolvedValue(mockResponse);

        const client = new TestApiClient();

        await expect(client.get("/endpoint", {})).rejects.toThrow(ApiClientError);
    });
});
