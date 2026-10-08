import { describe, expect, test, vi } from "vitest";

import { WindowTransport } from "./WindowTransport";

function peer(): Window {
    return { postMessage: vi.fn() } as unknown as Window;
}

function deliver(source: Window | null, origin = "https://www.crossmint.com") {
    const event = new MessageEvent("message", { data: { event: "ui:height.changed" }, origin });
    // jsdom's MessageEvent only accepts a real WindowProxy as `source`, so install the stub directly.
    Object.defineProperty(event, "source", { value: source });
    window.dispatchEvent(event);
}

describe("WindowTransport", () => {
    describe("when another frame on the page shares the target origin", () => {
        test("delivers only what the peer window sent", () => {
            const otherWindow = peer();
            const received = vi.fn();
            new WindowTransport(otherWindow, "https://www.crossmint.com").addMessageListener(received);

            deliver(otherWindow);
            deliver(peer());

            expect(received).toHaveBeenCalledTimes(1);
        });
    });

    test("drops a message whose sending window is gone", () => {
        const received = vi.fn();
        new WindowTransport(peer(), "https://www.crossmint.com").addMessageListener(received);

        deliver(null);

        expect(received).not.toHaveBeenCalled();
    });

    test("still drops a foreign origin, peer or not", () => {
        const otherWindow = peer();
        const received = vi.fn();
        new WindowTransport(otherWindow, "https://www.crossmint.com").addMessageListener(received);

        deliver(otherWindow, "https://evil.example.com");

        expect(received).not.toHaveBeenCalled();
    });

    test("removeMessageListener stops delivery", () => {
        const otherWindow = peer();
        const received = vi.fn();
        const transport = new WindowTransport(otherWindow, "https://www.crossmint.com");
        const id = transport.addMessageListener(received);

        transport.removeMessageListener(id);
        deliver(otherWindow);

        expect(received).not.toHaveBeenCalled();
    });
});
