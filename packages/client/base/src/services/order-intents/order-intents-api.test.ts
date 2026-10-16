import { ApiClient, type CrossmintApiClient } from "@crossmint/common-sdk-base";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import { OrderIntentsApiError, createOrderIntentsApi } from "./orderIntentsApi";

// A real ApiClient so the request goes through the shared fetch wrapper; only fetch is mocked.
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
    const [url, init] = call;
    return { url: String(url), init: init ?? {} };
}

const REGISTRATION = {
    paymentMethodId: "pm_1",
    rails: [
        { rail: "agentic-token", provider: "vic", status: "enabled" },
        { rail: "spt", provider: "stripe", status: "pending" },
    ],
};

const ORDER_INTENT = {
    orderIntentId: "3f1c2b40-9c1e-4c2a-9b1e-2f6d1a8c0f11",
    paymentMethodId: "pm_1",
    status: "active",
    amount: { total: "25.00", spent: "0.00", reserved: "0.00", available: "25.00", currency: "USD" },
    merchant: { name: "Example Shop", url: "https://shop.example.com", countryCode: "US" },
    description: "Sneakers",
    rails: [
        { rail: "agentic-token", provider: "vic", status: "pending_verification", credentialFormats: ["card"] },
        { rail: "encrypted-card", status: "active", credentialFormats: ["card"] },
        { rail: "spt", provider: "stripe", status: "active", credentialFormats: ["identifier"] },
    ],
    verificationConfig: { environment: "test", publicApiKey: "key_test_1", allowanceId: "alw_1" },
    expiresAt: "2026-09-24T12:00:00.000Z",
};

function api() {
    return createOrderIntentsApi({ apiClient: new TestApiClient() as unknown as CrossmintApiClient });
}

describe("createOrderIntentsApi", () => {
    beforeEach(() => {
        vi.stubGlobal("fetch", fetchMock);
    });

    afterEach(() => {
        vi.unstubAllGlobals();
        fetchMock.mockReset();
    });

    describe("getRegistration", () => {
        test("reads GET /api/unstable/payment-methods/{id}/order-intent-registration with the auth headers", async () => {
            fetchMock.mockResolvedValueOnce(jsonResponse(200, REGISTRATION));

            const registration = await api().getRegistration("pm 1");

            const { url, init } = lastRequest();
            expect(url).toBe(
                "https://staging.crossmint.com/api/unstable/payment-methods/pm%201/order-intent-registration"
            );
            expect(init.method).toBe("GET");
            expect(init.headers).toMatchObject({ "x-api-key": "ck_staging_key", Authorization: "Bearer jwt-1" });
            expect(registration).toEqual(REGISTRATION);
        });

        test("resolves to null on a JSON 404", async () => {
            fetchMock.mockResolvedValueOnce(jsonResponse(404, { message: "not found" }));

            expect(await api().getRegistration("pm_1")).toBeNull();
        });

        test("resolves to null on a non-JSON 404", async () => {
            fetchMock.mockResolvedValueOnce(new Response("<html>not found</html>", { status: 404 }));

            expect(await api().getRegistration("pm_1")).toBeNull();
        });

        test("drops rails it does not understand, and logs their identity only", async () => {
            const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
            fetchMock.mockResolvedValueOnce(
                jsonResponse(200, {
                    paymentMethodId: "pm_1",
                    rails: [{ rail: "future-rail", status: "enabled", secret: "x" }, REGISTRATION.rails[0]],
                })
            );

            const registration = await api().getRegistration("pm_1");

            expect(registration?.rails).toEqual([REGISTRATION.rails[0]]);
            expect(warn).toHaveBeenCalledTimes(1);
            expect(warn.mock.calls[0][1]).toEqual({ rail: "future-rail", provider: undefined, status: "enabled" });
            expect(JSON.stringify(warn.mock.calls[0])).not.toContain("secret");
            warn.mockRestore();
        });

        test("keeps a rail in error even when the server omits the error object", async () => {
            fetchMock.mockResolvedValueOnce(
                jsonResponse(200, {
                    paymentMethodId: "pm_1",
                    rails: [
                        { rail: "agentic-token", provider: "vic", status: "error" },
                        { rail: "agentic-token", provider: "agentpay", status: "error", error: null },
                    ],
                })
            );

            const registration = await api().getRegistration("pm_1");

            expect(registration?.rails).toEqual([
                { rail: "agentic-token", provider: "vic", status: "error", error: { code: "unknown" } },
                { rail: "agentic-token", provider: "agentpay", status: "error", error: { code: "unknown" } },
            ]);
        });
    });

    describe("register", () => {
        test("PUTs a JSON body to the registration route", async () => {
            fetchMock.mockResolvedValueOnce(jsonResponse(200, REGISTRATION));

            await api().register("pm_1", { email: "buyer@example.com", countryCode: "US" });

            const { url, init } = lastRequest();
            expect(url).toContain("/api/unstable/payment-methods/pm_1/order-intent-registration");
            expect(init.method).toBe("PUT");
            expect(init.headers).toMatchObject({ "Content-Type": "application/json" });
            expect(JSON.parse(String(init.body))).toEqual({ email: "buyer@example.com", countryCode: "US" });
        });

        test("sends an empty object when no registration details are given", async () => {
            fetchMock.mockResolvedValueOnce(jsonResponse(200, REGISTRATION));

            await api().register("pm_1");

            expect(JSON.parse(String(lastRequest().init.body))).toEqual({});
        });

        test("joins a NestJS validation message array into one message", async () => {
            fetchMock.mockResolvedValueOnce(
                jsonResponse(400, { message: ["countryCode must be upper case", "email must be an email"] })
            );

            await expect(api().register("pm_1", { countryCode: "us" })).rejects.toMatchObject({
                name: "OrderIntentsApiError",
                message: "countryCode must be upper case; email must be an email",
            });
        });

        test("surfaces the server message of a JSON 4xx as OrderIntentsApiError", async () => {
            fetchMock.mockResolvedValueOnce(jsonResponse(400, { message: "countryCode must be ISO 3166-1 alpha-2" }));

            await expect(api().register("pm_1", { countryCode: "usa" })).rejects.toMatchObject({
                name: "OrderIntentsApiError",
                status: 400,
                message: "countryCode must be ISO 3166-1 alpha-2",
            });
        });
    });

    describe("createOrderIntent", () => {
        const request = {
            paymentMethodId: "pm_1",
            amount: { value: "25.00", currency: "USD" },
            merchant: { name: "Example Shop", url: "https://shop.example.com", countryCode: "US" },
            description: "Sneakers",
            expiresAt: "2026-09-24T12:00:00.000Z",
        };

        test("POSTs the request to /api/unstable/order-intents and parses the order intent", async () => {
            fetchMock.mockResolvedValueOnce(jsonResponse(201, ORDER_INTENT));

            const orderIntent = await api().createOrderIntent(request);

            const { url, init } = lastRequest();
            expect(url).toBe("https://staging.crossmint.com/api/unstable/order-intents");
            expect(init.method).toBe("POST");
            expect(JSON.parse(String(init.body))).toEqual(request);
            expect(orderIntent).toEqual(ORDER_INTENT);
            expect(orderIntent.verificationConfig?.allowanceId).toBe("alw_1");
        });

        test("returns an order intent without verificationConfig when the server sends none", async () => {
            const { verificationConfig: _omitted, ...withoutVerification } = ORDER_INTENT;
            fetchMock.mockResolvedValueOnce(jsonResponse(201, withoutVerification));

            const orderIntent = await api().createOrderIntent(request);

            expect(orderIntent.verificationConfig).toBeUndefined();
        });

        test("drops rails with an unknown shape and keeps the rest", async () => {
            fetchMock.mockResolvedValueOnce(
                jsonResponse(201, {
                    ...ORDER_INTENT,
                    rails: [
                        { rail: "agentic-token", provider: "vic", status: "brand-new-status" },
                        ORDER_INTENT.rails[1],
                    ],
                })
            );

            const orderIntent = await api().createOrderIntent(request);

            expect(orderIntent.rails).toEqual([ORDER_INTENT.rails[1]]);
        });

        test("keeps the rails in the order the server lists them", async () => {
            const reordered = [ORDER_INTENT.rails[1], ORDER_INTENT.rails[2], ORDER_INTENT.rails[0]];
            fetchMock.mockResolvedValueOnce(jsonResponse(201, { ...ORDER_INTENT, rails: reordered }));

            const orderIntent = await api().createOrderIntent(request);

            expect(orderIntent.rails).toEqual(reordered);
        });

        test("wraps a non-JSON 2xx body as OrderIntentsApiError", async () => {
            fetchMock.mockResolvedValueOnce(
                new Response("<html>ok</html>", { status: 201, headers: { "content-type": "text/html" } })
            );

            await expect(api().createOrderIntent(request)).rejects.toMatchObject({
                name: "OrderIntentsApiError",
                status: 201,
                path: "/api/unstable/order-intents",
            });
        });

        test("wraps an empty 2xx body as OrderIntentsApiError", async () => {
            fetchMock.mockResolvedValueOnce(new Response("", { status: 201 }));

            await expect(api().createOrderIntent(request)).rejects.toMatchObject({
                name: "OrderIntentsApiError",
                status: 201,
            });
        });

        test("rejects a response that is not an order intent", async () => {
            fetchMock.mockResolvedValueOnce(jsonResponse(201, { orderIntentId: "x" }));

            await expect(api().createOrderIntent(request)).rejects.toBeInstanceOf(OrderIntentsApiError);
        });
    });

    describe("cancelOrderIntent", () => {
        test("sends DELETE /api/unstable/order-intents/{id} and resolves on 204", async () => {
            fetchMock.mockResolvedValueOnce(new Response(null, { status: 204 }));

            await expect(api().cancelOrderIntent("oi_1")).resolves.toBeUndefined();

            const { url, init } = lastRequest();
            expect(url).toBe("https://staging.crossmint.com/api/unstable/order-intents/oi_1");
            expect(init.method).toBe("DELETE");
        });

        test("surfaces a JSON 4xx as OrderIntentsApiError with the server message", async () => {
            fetchMock.mockResolvedValueOnce(jsonResponse(409, { message: "order intent is not active" }));

            await expect(api().cancelOrderIntent("oi_1")).rejects.toMatchObject({
                name: "OrderIntentsApiError",
                status: 409,
                message: "order intent is not active",
            });
        });
    });

    describe("getOrderIntent", () => {
        test("reads GET /api/unstable/order-intents/{id}", async () => {
            fetchMock.mockResolvedValueOnce(jsonResponse(200, ORDER_INTENT));

            const orderIntent = await api().getOrderIntent(ORDER_INTENT.orderIntentId);

            const { url, init } = lastRequest();
            expect(url).toBe(`https://staging.crossmint.com/api/unstable/order-intents/${ORDER_INTENT.orderIntentId}`);
            expect(init.method).toBe("GET");
            expect(orderIntent.orderIntentId).toBe(ORDER_INTENT.orderIntentId);
        });

        test("wraps a 5xx from the shared client as OrderIntentsApiError, keeping the status", async () => {
            fetchMock.mockResolvedValueOnce(new Response("upstream down", { status: 502, statusText: "Bad Gateway" }));

            await expect(api().getOrderIntent("oi_1")).rejects.toMatchObject({
                name: "OrderIntentsApiError",
                status: 502,
                path: "/api/unstable/order-intents/oi_1",
            });
        });

        test("wraps a rejected fetch (offline) as OrderIntentsApiError with no status", async () => {
            fetchMock.mockRejectedValueOnce(new TypeError("Failed to fetch"));

            await expect(api().getOrderIntent("oi_1")).rejects.toMatchObject({
                name: "OrderIntentsApiError",
                status: undefined,
                path: "/api/unstable/order-intents/oi_1",
                message: "Failed to fetch",
            });
        });

        test("wraps a non-JSON 4xx, such as an HTML 403 from a proxy, as OrderIntentsApiError", async () => {
            fetchMock.mockResolvedValueOnce(
                new Response("<html>blocked</html>", { status: 403, statusText: "Forbidden" })
            );

            await expect(api().getOrderIntent("oi_1")).rejects.toMatchObject({
                name: "OrderIntentsApiError",
                status: 403,
            });
        });
    });
});
