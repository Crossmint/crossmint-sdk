import { ApiClient } from "@crossmint/common-sdk-base";
import { renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import { useOrderIntents } from "./useOrderIntents";
import { useProtectedInputs } from "./useProtectedInputs";

// Derives its auth header from the configuration the hook passes, like the real client, so a
// hook that dropped or froze the jwt would fail the header assertions below.
class TestApiClient extends ApiClient {
    constructor(private readonly crossmint: { apiKey: string; jwt?: string }) {
        super();
    }
    get commonHeaders() {
        return { "x-api-key": this.crossmint.apiKey, Authorization: `Bearer ${this.crossmint.jwt}` };
    }
    get baseUrl() {
        return "https://staging.crossmint.com";
    }
}

const stubs = vi.hoisted(() => ({
    crossmint: { crossmint: { apiKey: "ck_staging_key" } },
    createCrossmintApiClient: vi.fn(),
}));
vi.mock("@crossmint/client-sdk-react-base", () => ({ useCrossmint: () => stubs.crossmint }));
vi.mock("@/utils/createCrossmintApiClient", () => ({
    createCrossmintApiClient: (crossmint: { apiKey: string; jwt?: string }) => {
        stubs.createCrossmintApiClient(crossmint);
        return new TestApiClient(crossmint);
    },
}));

const fetchMock = vi.fn<typeof fetch>();

describe("useProtectedInputs / useOrderIntents", () => {
    beforeEach(() => {
        vi.stubGlobal("fetch", fetchMock);
    });
    afterEach(() => {
        vi.unstubAllGlobals();
        fetchMock.mockReset();
    });

    test("useProtectedInputs revokes through DELETE /api/unstable/protected-inputs/{id} as the buyer named by jwt", async () => {
        fetchMock.mockResolvedValueOnce(new Response(null, { status: 204 }));
        const { result } = renderHook(() => useProtectedInputs("jwt-1"));

        await result.current.revoke("pi_1");

        const [url, init] = fetchMock.mock.calls[0];
        expect(String(url)).toBe("https://staging.crossmint.com/api/unstable/protected-inputs/pi_1");
        expect(init?.method).toBe("DELETE");
        expect(init?.headers).toMatchObject({ Authorization: "Bearer jwt-1" });
        expect(stubs.createCrossmintApiClient).toHaveBeenCalledWith(expect.objectContaining({ jwt: "jwt-1" }));
    });

    test("useOrderIntents cancels through DELETE /api/unstable/order-intents/{id}", async () => {
        fetchMock.mockResolvedValueOnce(new Response(null, { status: 204 }));
        const { result } = renderHook(() => useOrderIntents("jwt-1"));

        await result.current.cancelOrderIntent("oi_1");

        const [url, init] = fetchMock.mock.calls[0];
        expect(String(url)).toBe("https://staging.crossmint.com/api/unstable/order-intents/oi_1");
        expect(init?.method).toBe("DELETE");
    });

    test("keeps the same api object across re-renders and sends requests as the new buyer after a jwt change", async () => {
        fetchMock.mockResolvedValue(new Response(null, { status: 204 }));
        const { result, rerender } = renderHook(({ jwt }) => useProtectedInputs(jwt), {
            initialProps: { jwt: "jwt-1" },
        });
        const first = result.current;

        rerender({ jwt: "jwt-1" });
        expect(result.current).toBe(first);

        rerender({ jwt: "jwt-2" });
        expect(result.current).not.toBe(first);
        await result.current.revoke("pi_2");

        const [, init] = fetchMock.mock.calls.at(-1) ?? [];
        expect(init?.headers).toMatchObject({ Authorization: "Bearer jwt-2" });
    });
});
