import { afterEach, describe, expect, test, vi } from "vitest";
import { z } from "zod";

import { EventEmitter } from "./EventEmitter";
import type { SimpleMessageEvent, Transport } from "./transport/Transport";

const incoming = { pong: z.object({}) };
const outgoing = { ping: z.object({}) };

function silentTransport(): Transport<typeof outgoing> {
    return {
        send: vi.fn(),
        addMessageListener: (_listener: (event: SimpleMessageEvent | MessageEvent) => void) => "id",
        removeMessageListener: vi.fn(),
    };
}

function emitter() {
    return new EventEmitter(silentTransport(), incoming, outgoing);
}

afterEach(() => {
    vi.restoreAllMocks();
});

describe("a timeout the caller receives as a rejection", () => {
    test("sendAction does not report it as an error", async () => {
        const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});

        await expect(
            emitter().sendAction({ event: "ping", data: {}, responseEvent: "pong", options: { timeoutMs: 1 } })
        ).rejects.toBeTruthy();

        expect(consoleError).not.toHaveBeenCalled();
    });

    test("onAction does not report it as an error", async () => {
        const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});

        await expect(emitter().onAction({ event: "pong", options: { timeoutMs: 1 } })).rejects.toBeTruthy();

        expect(consoleError).not.toHaveBeenCalled();
    });

    test("sendAction exhausting its retries does not report it as an error", async () => {
        const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});

        await expect(
            emitter().sendAction({
                event: "ping",
                data: {},
                responseEvent: "pong",
                options: { timeoutMs: 10_000, intervalMs: 1, maxRetries: 1 },
            })
        ).rejects.toBeTruthy();

        expect(consoleError).not.toHaveBeenCalled();
    });
});
