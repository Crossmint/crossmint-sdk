import { ApiClient, type CrossmintApiClient } from "@crossmint/common-sdk-base";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import { AgentCheckoutsApiError, createAgentCheckoutsApi } from "./agentCheckoutsApi";

class TestApiClient extends ApiClient {
    get commonHeaders() {
        return { "x-api-key": "ck_development_key", Authorization: "Bearer jwt-1" };
    }
    get baseUrl() {
        return "http://localhost:3000";
    }
}

const fetchMock = vi.fn<typeof fetch>();

function jsonResponse(status: number, body: unknown) {
    return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
}

function sseResponse(frames: string[]) {
    const encoder = new TextEncoder();
    const body = new ReadableStream<Uint8Array>({
        start(controller) {
            for (const frame of frames) {
                controller.enqueue(encoder.encode(frame));
            }
            controller.close();
        },
    });
    return new Response(body, { status: 200, headers: { "content-type": "text/event-stream" } });
}

function request(index = -1) {
    const call = fetchMock.mock.calls.at(index);
    if (call == null) {
        throw new Error("fetch was not called");
    }
    const [url, init] = call;
    return { url: String(url), init: init ?? {}, headers: new Headers(init?.headers) };
}

const RUN_ID = "11111111-1111-4111-8111-111111111111";
const RUN = {
    runId: RUN_ID,
    createdAt: "2026-10-01T12:00:00.000Z",
    revision: 0,
    status: "queued",
    input: {
        request: { startUrl: "https://shop.example" },
        constraints: { maxCost: { amount: "25.00", currency: "USD" } },
    },
    browser: null,
    requiredAction: null,
};
const MESSAGE = {
    id: "m1",
    revision: 1,
    role: "assistant",
    createdAt: "2026-10-01T12:00:01.000Z",
    parts: [{ type: "text", text: "Looking at the product page" }],
};

function api() {
    return createAgentCheckoutsApi({ apiClient: new TestApiClient() as unknown as CrossmintApiClient });
}

async function collect<T>(iterator: AsyncGenerator<T>): Promise<T[]> {
    const items: T[] = [];
    for await (const item of iterator) {
        items.push(item);
    }
    return items;
}

describe("createAgentCheckoutsApi", () => {
    beforeEach(() => {
        vi.stubGlobal("fetch", fetchMock);
    });
    afterEach(() => {
        fetchMock.mockReset();
        vi.unstubAllGlobals();
    });

    test("create posts the input with the client key and buyer JWT and keeps unknown run fields", async () => {
        fetchMock.mockResolvedValueOnce(jsonResponse(201, RUN));

        const run = await api().create({
            request: { startUrl: "https://shop.example" },
            constraints: { maxCost: { amount: "25.00", currency: "USD" } },
        });

        const { url, init, headers } = request();
        expect(url).toBe("http://localhost:3000/api/unstable/agent-checkouts");
        expect(init.method).toBe("POST");
        expect(headers.get("x-api-key")).toBe("ck_development_key");
        expect(headers.get("authorization")).toBe("Bearer jwt-1");
        expect(JSON.parse(String(init.body))).toEqual({
            request: { startUrl: "https://shop.example" },
            constraints: { maxCost: { amount: "25.00", currency: "USD" } },
        });
        expect(run).toEqual(RUN);
    });

    test("create sends a caller-owned CDP browser on the first request", async () => {
        const browser = {
            cdp: {
                url: "wss://browser.example/devtools/browser/abc",
                headers: { authorization: "Bearer provider-key" },
            },
        };
        fetchMock.mockResolvedValueOnce(
            jsonResponse(201, { ...RUN, input: { ...RUN.input, browser: { cdp: { redacted: true } } } })
        );

        const run = await api().create({
            request: { startUrl: "https://shop.example" },
            constraints: { maxCost: { amount: "25.00", currency: "USD" } },
            browser,
        });

        expect(JSON.parse(String(request().init.body))).toMatchObject({ browser });
        expect(run.input).toEqual({ ...RUN.input, browser: { cdp: { redacted: true } } });
    });

    test("routes each operation to its public path", async () => {
        fetchMock
            .mockResolvedValueOnce(jsonResponse(200, RUN))
            .mockResolvedValueOnce(jsonResponse(200, { data: [RUN], nextCursor: null }))
            .mockResolvedValueOnce(jsonResponse(202, { runId: RUN_ID, status: "accepted" }))
            .mockResolvedValueOnce(jsonResponse(200, { data: [MESSAGE], nextCursor: null, streamCursor: "c1" }))
            .mockResolvedValueOnce(jsonResponse(202, { status: "accepted", messageId: "m2" }))
            .mockResolvedValueOnce(jsonResponse(200, { data: [], nextCursor: null }))
            .mockResolvedValueOnce(new Response(null, { status: 204 }));
        const client = api();

        await client.get(RUN_ID);
        await client.list({ limit: 5 });
        await client.cancel(RUN_ID);
        await client.listMessages(RUN_ID, { cursor: "p2", limit: 100 });
        await client.sendMessage(RUN_ID, { id: "m2", parts: [{ type: "text", text: "Size M" }] });
        await client.buyerProfiles.list({});
        await client.browserProfiles.delete("bp/1");

        const calls = fetchMock.mock.calls.map(([url, init]) => `${init?.method} ${String(url)}`);
        const base = "http://localhost:3000/api/unstable/agent-checkouts";
        expect(calls).toEqual([
            `GET ${base}/${RUN_ID}`,
            `GET ${base}?limit=5`,
            `POST ${base}/${RUN_ID}/cancel`,
            `GET ${base}/${RUN_ID}/messages?cursor=p2&limit=100`,
            `POST ${base}/${RUN_ID}/messages`,
            `GET ${base}/buyer-profiles`,
            `DELETE ${base}/browser-profiles/bp%2F1`,
        ]);
    });

    test("a JSON 4xx becomes AgentCheckoutsApiError with the API's message and body", async () => {
        const body = {
            message: "Agent Checkouts is only available in production",
            error: "Forbidden",
            statusCode: 403,
        };
        fetchMock.mockResolvedValueOnce(jsonResponse(403, body));

        const error = await api()
            .get(RUN_ID)
            .catch((cause: unknown) => cause);

        expect(error).toBeInstanceOf(AgentCheckoutsApiError);
        expect(error).toMatchObject({ status: 403, message: body.message, body });
    });

    test("a 5xx becomes AgentCheckoutsApiError", async () => {
        fetchMock.mockResolvedValueOnce(new Response("upstream down", { status: 502, statusText: "Bad Gateway" }));

        await expect(api().get(RUN_ID)).rejects.toMatchObject({ name: "AgentCheckoutsApiError", status: 502 });
    });

    test("a response missing required run fields is rejected", async () => {
        fetchMock.mockResolvedValueOnce(jsonResponse(200, { runId: RUN_ID }));

        await expect(api().get(RUN_ID)).rejects.toThrow(/Unexpected response shape/);
    });

    test("streamMessages yields events in order and stops at a terminal run update", async () => {
        fetchMock.mockResolvedValueOnce(
            sseResponse([
                ": keep-alive\n\n",
                `id: c2\nevent: message.upsert\ndata: ${JSON.stringify(MESSAGE)}\n\n`,
                `id: c3\nevent: run.updated\ndata: ${JSON.stringify({ ...RUN, revision: 3, status: "succeeded" })}\n\n`,
                `id: c4\nevent: message.upsert\ndata: ${JSON.stringify(MESSAGE)}\n\n`,
            ])
        );

        const events = await collect(api().streamMessages(RUN_ID, { after: "c1" }));

        const { url, headers } = request();
        expect(url).toBe(`http://localhost:3000/api/unstable/agent-checkouts/${RUN_ID}/messages/stream?after=c1`);
        expect(headers.get("accept")).toBe("text/event-stream");
        expect(headers.get("last-event-id")).toBe("c1");
        expect(headers.get("authorization")).toBe("Bearer jwt-1");
        expect(events.map((event) => [event.type, event.cursor])).toEqual([
            ["message.upsert", "c2"],
            ["run.updated", "c3"],
        ]);
    });

    test("streamMessages reconnects from the last cursor after the connection closes", async () => {
        fetchMock
            .mockResolvedValueOnce(sseResponse([`id: c2\nevent: message.upsert\ndata: ${JSON.stringify(MESSAGE)}\n\n`]))
            .mockResolvedValueOnce(
                sseResponse([`id: c3\nevent: run.updated\ndata: ${JSON.stringify({ ...RUN, status: "failed" })}\n\n`])
            );

        const events = await collect(api().streamMessages(RUN_ID, { reconnectDelayMs: 0 }));

        expect(events.map((event) => event.cursor)).toEqual(["c2", "c3"]);
        expect(request(1).url).toContain("/messages/stream?after=c2");
    });

    test("streamMessages gives up with resync_required when the stream keeps closing empty", async () => {
        fetchMock.mockImplementation(async () => sseResponse([]));

        const error = await collect(api().streamMessages(RUN_ID, { reconnectDelayMs: 0, maxEmptyReconnects: 2 })).catch(
            (cause: unknown) => cause
        );

        expect(error).toMatchObject({ name: "AgentCheckoutsApiError", code: "resync_required" });
        expect(fetchMock).toHaveBeenCalledTimes(3);
    });

    test("streamMessages surfaces a 4xx without retrying", async () => {
        fetchMock.mockResolvedValueOnce(jsonResponse(404, { message: "Checkout not found" }));

        await expect(collect(api().streamMessages(RUN_ID))).rejects.toMatchObject({ status: 404 });
        expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    test("streamMessages ends quietly when aborted", async () => {
        const controller = new AbortController();
        fetchMock.mockImplementation(() => {
            controller.abort();
            return Promise.reject(new DOMException("aborted", "AbortError"));
        });

        await expect(collect(api().streamMessages(RUN_ID, { signal: controller.signal }))).resolves.toEqual([]);
    });
});
