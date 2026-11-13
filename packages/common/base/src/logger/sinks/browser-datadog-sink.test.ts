// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

// Loaded first, as the SDK entry point does: the logger index and the sinks import each other.
import "../init-helpers";
import { BrowserDatadogSink } from "./BrowserDatadogSink";

function logEntry() {
    return {
        level: "info" as const,
        message: "react.agentCardAuthorization.abandoned",
        timestamp: Date.now(),
        context: {},
    };
}

describe("BrowserDatadogSink", () => {
    let fetchMock: ReturnType<typeof vi.fn>;

    beforeEach(() => {
        fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 202 }));
        vi.stubGlobal("fetch", fetchMock);
    });

    afterEach(() => {
        vi.unstubAllGlobals();
    });

    describe("when flushed on page exit", () => {
        test("sends the batch with a keepalive request", async () => {
            const sink = new BrowserDatadogSink("staging");
            sink.write(logEntry());

            await sink.flush({ keepalive: true });

            expect(fetchMock).toHaveBeenCalledOnce();
            expect(fetchMock.mock.calls[0][1]).toMatchObject({ method: "POST", keepalive: true });
        });
    });

    describe("when flushed while the page is open", () => {
        test("sends the batch without keepalive, so its size is not capped", async () => {
            const sink = new BrowserDatadogSink("staging");
            sink.write(logEntry());

            await sink.flush();

            expect(fetchMock).toHaveBeenCalledOnce();
            expect(fetchMock.mock.calls[0][1]).not.toHaveProperty("keepalive");
        });
    });
});
