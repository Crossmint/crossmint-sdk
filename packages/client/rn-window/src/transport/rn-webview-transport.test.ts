import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import { RNWebViewTransport } from "./RNWebViewTransport";

// The polyfills import react-native-get-random-values, which vitest can't parse.
vi.mock("../polyfills", () => ({}));

const host = window as unknown as { ReactNativeWebView?: unknown };

function postMessageEvent(source: MessageEventSource | null) {
    window.dispatchEvent(new MessageEvent("message", { data: { event: "crypto:send-transaction:success" }, source }));
}

describe("RNWebViewTransport in a WebView", () => {
    let received: unknown[];
    let transport: RNWebViewTransport;
    let listenerId: string;

    beforeEach(() => {
        host.ReactNativeWebView = { postMessage: vi.fn() };
        vi.spyOn(console, "info").mockImplementation(() => {});
        vi.spyOn(console, "warn").mockImplementation(() => {});
        received = [];
        transport = new RNWebViewTransport();
        listenerId = transport.addMessageListener((event) => received.push(event.data));
    });

    afterEach(() => {
        transport.removeMessageListener(listenerId);
        delete host.ReactNativeWebView;
        vi.restoreAllMocks();
    });

    describe("when a message has a null source (host delivery)", () => {
        it("reaches listeners", () => {
            postMessageEvent(null);
            expect(received).toHaveLength(1);
        });
    });

    describe("when a message comes from the page's own window", () => {
        it("reaches listeners", () => {
            postMessageEvent(window);
            expect(received).toHaveLength(1);
        });
    });

    describe("when a message comes from another window", () => {
        it("is ignored", () => {
            const frame = document.createElement("iframe");
            document.body.appendChild(frame);
            postMessageEvent(frame.contentWindow);
            frame.remove();
            expect(received).toHaveLength(0);
        });
    });
});
