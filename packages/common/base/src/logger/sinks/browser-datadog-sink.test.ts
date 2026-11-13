// @vitest-environment jsdom
import { afterEach, describe, expect, test, vi } from "vitest";

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
    afterEach(() => {
        vi.unstubAllGlobals();
    });

    describe("when the page is hidden with logs still in the batch", () => {
        test("sends them with a keepalive request", () => {
            const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 202 }));
            vi.stubGlobal("fetch", fetchMock);
            const sink = new BrowserDatadogSink("staging");
            sink.write(logEntry());

            window.dispatchEvent(new Event("pagehide"));

            expect(fetchMock).toHaveBeenCalledOnce();
            expect(fetchMock.mock.calls[0][1]).toMatchObject({ method: "POST", keepalive: true });
        });
    });
});
