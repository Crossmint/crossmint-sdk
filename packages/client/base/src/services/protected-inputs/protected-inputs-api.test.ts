import { ApiClient, type CrossmintApiClient } from "@crossmint/common-sdk-base";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import { ProtectedInputsApiError, createProtectedInputsApi } from "./protectedInputsApi";

class TestApiClient extends ApiClient {
    get commonHeaders() {
        return { "x-api-key": "ck_staging_key", Authorization: "Bearer jwt-1" };
    }
    get baseUrl() {
        return "https://staging.crossmint.com";
    }
}

const fetchMock = vi.fn<typeof fetch>();

function jsonResponse(status: number, body: unknown) {
    return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
}

function lastRequest() {
    const call = fetchMock.mock.calls.at(-1);
    if (call == null) {
        throw new Error("fetch was not called");
    }
    return { url: String(call[0]), init: call[1] ?? {} };
}

const INPUT = {
    protectedInputId: "5f0c2a9e-7b1d-4c3a-9e8f-2d6b4a1c0e7f",
    purpose: "password",
    status: "active",
    merchant: { domain: "shop.example.com" },
    expiresAt: "2026-09-25T12:00:00.000Z",
    createdAt: "2026-09-24T12:00:00.000Z",
};

function api() {
    return createProtectedInputsApi({ apiClient: new TestApiClient() as unknown as CrossmintApiClient });
}

describe("createProtectedInputsApi", () => {
    beforeEach(() => {
        vi.stubGlobal("fetch", fetchMock);
    });

    afterEach(() => {
        vi.unstubAllGlobals();
        fetchMock.mockReset();
    });

    describe("list", () => {
        test("reads GET /api/unstable/protected-inputs with the auth headers and returns the metadata", async () => {
            fetchMock.mockResolvedValueOnce(jsonResponse(200, [INPUT]));

            const inputs = await api().list();

            const { url, init } = lastRequest();
            expect(url).toBe("https://staging.crossmint.com/api/unstable/protected-inputs");
            expect(init.method).toBe("GET");
            expect(init.headers).toMatchObject({ "x-api-key": "ck_staging_key", Authorization: "Bearer jwt-1" });
            expect(inputs).toEqual([INPUT]);
        });

        test("drops an entry it cannot read, logging only its id and purpose", async () => {
            const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
            fetchMock.mockResolvedValueOnce(
                jsonResponse(200, [{ ...INPUT, protectedInputId: "pi_future", purpose: "otp", secret: "x" }, INPUT])
            );

            const inputs = await api().list();

            expect(inputs).toEqual([INPUT]);
            expect(warn).toHaveBeenCalledTimes(1);
            expect(warn.mock.calls[0][1]).toEqual({ protectedInputId: "pi_future", purpose: "otp" });
            expect(JSON.stringify(warn.mock.calls[0])).not.toContain("secret");
            warn.mockRestore();
        });
    });

    describe("get", () => {
        test("reads GET /api/unstable/protected-inputs/{id}", async () => {
            fetchMock.mockResolvedValueOnce(jsonResponse(200, INPUT));

            const input = await api().get(INPUT.protectedInputId);

            expect(lastRequest().url).toBe(
                `https://staging.crossmint.com/api/unstable/protected-inputs/${INPUT.protectedInputId}`
            );
            expect(input).toEqual(INPUT);
        });

        test("surfaces a JSON 404 as ProtectedInputsApiError with the server message", async () => {
            fetchMock.mockResolvedValueOnce(jsonResponse(404, { message: "protected input not found" }));

            await expect(api().get("missing")).rejects.toMatchObject({
                name: "ProtectedInputsApiError",
                status: 404,
                message: "protected input not found",
            });
        });
    });

    describe("revoke", () => {
        test("sends DELETE /api/unstable/protected-inputs/{id} and resolves on 204", async () => {
            fetchMock.mockResolvedValueOnce(new Response(null, { status: 204 }));

            await expect(api().revoke("pi 1")).resolves.toBeUndefined();

            const { url, init } = lastRequest();
            expect(url).toBe("https://staging.crossmint.com/api/unstable/protected-inputs/pi%201");
            expect(init.method).toBe("DELETE");
        });

        test("wraps a rejected fetch (offline) as ProtectedInputsApiError with no status", async () => {
            fetchMock.mockRejectedValueOnce(new TypeError("Failed to fetch"));

            const error = await api()
                .revoke("pi_1")
                .catch((caught: unknown) => caught);

            expect(error).toBeInstanceOf(ProtectedInputsApiError);
            expect(error).toMatchObject({
                status: undefined,
                path: "/api/unstable/protected-inputs/pi_1",
                message: "Failed to fetch",
            });
        });

        test("wraps a 5xx from the shared client as ProtectedInputsApiError, keeping the status", async () => {
            fetchMock.mockResolvedValueOnce(new Response("upstream down", { status: 502, statusText: "Bad Gateway" }));

            const error = await api()
                .revoke("pi_1")
                .catch((caught: unknown) => caught);

            expect(error).toBeInstanceOf(ProtectedInputsApiError);
            expect(error).toMatchObject({ status: 502, path: "/api/unstable/protected-inputs/pi_1" });
        });
    });
});
