import { describe, expect, test, vi, beforeEach } from "vitest";
import { ApiClient } from "./ApiClient";

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

class TestApiClient extends ApiClient {
    get authHeaders(): HeadersInit {
        return { "x-api-key": "test-key" };
    }

    get baseUrl(): string {
        return "https://api.test.com";
    }
}

describe("ApiClient", () => {
    let client: TestApiClient;

    beforeEach(() => {
        client = new TestApiClient();
        mockFetch.mockClear();
    });

    describe("buildUrl", () => {
        test("should correctly build URL with normalized paths", () => {
            const url = client.buildUrl("/test/path");
            expect(url).toBe("https://api.test.com/test/path");
        });

        test("should handle paths with leading and trailing slashes", () => {
            const url = client.buildUrl("/test/path/");
            expect(url).toBe("https://api.test.com/test/path");
        });

        test("should handle empty path", () => {
            const url = client.buildUrl("");
            expect(url).toBe("https://api.test.com/");
        });
    });

    describe("HTTP methods", () => {
        const testPath = "/test";
        const testParams = {
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ test: "data" }),
        };

        test("should make GET request with correct parameters", async () => {
            mockFetch.mockResolvedValueOnce(new Response());
            await client.get(testPath, testParams);

            expect(mockFetch).toHaveBeenCalledWith(
                "https://api.test.com/test",
                expect.objectContaining({
                    method: "GET",
                    headers: expect.objectContaining({
                        "x-api-key": "test-key",
                        "Content-Type": "application/json",
                    }),
                    body: JSON.stringify({ test: "data" }),
                })
            );
        });

        test("should make POST request with correct parameters", async () => {
            mockFetch.mockResolvedValueOnce(new Response());
            await client.post(testPath, testParams);

            expect(mockFetch).toHaveBeenCalledWith(
                "https://api.test.com/test",
                expect.objectContaining({
                    method: "POST",
                    headers: expect.objectContaining({
                        "x-api-key": "test-key",
                        "Content-Type": "application/json",
                    }),
                    body: JSON.stringify({ test: "data" }),
                })
            );
        });

        test("should make PUT request with correct parameters", async () => {
            mockFetch.mockResolvedValueOnce(new Response());
            await client.put(testPath, testParams);

            expect(mockFetch).toHaveBeenCalledWith(
                "https://api.test.com/test",
                expect.objectContaining({
                    method: "PUT",
                    headers: expect.objectContaining({
                        "x-api-key": "test-key",
                        "Content-Type": "application/json",
                    }),
                    body: JSON.stringify({ test: "data" }),
                })
            );
        });

        test("should make DELETE request with correct parameters", async () => {
            mockFetch.mockResolvedValueOnce(new Response());
            await client.delete(testPath, testParams);

            expect(mockFetch).toHaveBeenCalledWith(
                "https://api.test.com/test",
                expect.objectContaining({
                    method: "DELETE",
                    headers: expect.objectContaining({
                        "x-api-key": "test-key",
                        "Content-Type": "application/json",
                    }),
                    body: JSON.stringify({ test: "data" }),
                })
            );
        });

        test("should make PATCH request with correct parameters", async () => {
            mockFetch.mockResolvedValueOnce(new Response());
            await client.patch(testPath, testParams);

            expect(mockFetch).toHaveBeenCalledWith(
                "https://api.test.com/test",
                expect.objectContaining({
                    method: "PATCH",
                    headers: expect.objectContaining({
                        "x-api-key": "test-key",
                        "Content-Type": "application/json",
                    }),
                    body: JSON.stringify({ test: "data" }),
                })
            );
        });
    });
}); 