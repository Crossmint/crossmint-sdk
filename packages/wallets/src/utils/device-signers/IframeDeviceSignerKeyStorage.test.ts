// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { IframeDeviceSignerKeyStorage } from "./IframeDeviceSignerKeyStorage";

const API_KEY =
    "ck_development_A61UZQnvjSQcM5qVBaBactgqebxafWAVsNdD2xLkgBxoYuH5q2guM8r9DUmZQzE1WYyoByGVYpEG2o9gVSzAZFsrLbfKGERUJ6D5CW6S9AsJGAc3ctgrsD4n2ioekzGj7KPbLwT3SysDjMamYXLxEroUbQSdwf6aLF4zeEpECq2crkTUQeLFzxzmjWNxFDHFYefDrfrFPCURvBXJLf5pCxCQ";
const IFRAME_ORIGIN = "https://development.devicekey.store";

function setChromeUserAgent(): void {
    vi.stubGlobal("navigator", {
        userAgent:
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    });
}

async function captureNextIframe(): Promise<HTMLIFrameElement> {
    return new Promise((resolve) => {
        const originalCreateElement = document.createElement.bind(document);
        const spy = vi.spyOn(document, "createElement").mockImplementation((tagName: string) => {
            const element = originalCreateElement(tagName);
            if (tagName === "iframe") {
                spy.mockRestore();
                element.addEventListener("load", () => resolve(element as HTMLIFrameElement), { once: true });
                queueMicrotask(() => element.dispatchEvent(new Event("load")));
            }
            return element;
        });
    });
}

function respondToNextRpc(
    iframe: HTMLIFrameElement,
    respond: (message: { type: string; id: string; payload: Record<string, unknown> }) => unknown
): void {
    const postMessage = vi.fn((message: { type: string; id: string; payload: Record<string, unknown> }) => {
        const result = respond(message);
        queueMicrotask(() => {
            window.dispatchEvent(
                new MessageEvent("message", {
                    data: { type: "response", id: message.id, result },
                    origin: IFRAME_ORIGIN,
                })
            );
        });
    });
    Object.defineProperty(iframe, "contentWindow", {
        value: { postMessage },
        configurable: true,
    });
}

function failNextRpcWithIdbFatal(iframe: HTMLIFrameElement): void {
    const postMessage = vi.fn((message: { type: string; id: string }) => {
        queueMicrotask(() => {
            window.dispatchEvent(
                new MessageEvent("message", {
                    data: { type: "error", id: message.id, error: "IDB fatal", code: "indexeddb-fatal" },
                    origin: IFRAME_ORIGIN,
                })
            );
        });
    });
    Object.defineProperty(iframe, "contentWindow", {
        value: { postMessage },
        configurable: true,
    });
}

describe("IframeDeviceSignerKeyStorage — recovers from a fatal IndexedDB error", () => {
    beforeEach(() => {
        setChromeUserAgent();
    });

    afterEach(() => {
        vi.unstubAllGlobals();
        document.body.innerHTML = "";
    });

    it("reloads the iframe once and retries after a fatal IDB error, resolving with the retried value", async () => {
        const storage = new IframeDeviceSignerKeyStorage(API_KEY);

        const firstIframePromise = captureNextIframe();
        const getKeyPromise = storage.getKey("0xaddress");
        const firstIframe = await firstIframePromise;
        failNextRpcWithIdbFatal(firstIframe);

        const secondIframe = await captureNextIframe();
        respondToNextRpc(secondIframe, () => ({ publicKeyBase64: "recovered-key" }));

        await expect(getKeyPromise).resolves.toBe("recovered-key");
    });

    it("throws a named error when the fatal IDB error persists after the iframe reload", async () => {
        const storage = new IframeDeviceSignerKeyStorage(API_KEY);

        const firstIframePromise = captureNextIframe();
        const getKeyPromise = storage.getKey("0xaddress");
        const firstIframe = await firstIframePromise;
        failNextRpcWithIdbFatal(firstIframe);

        const secondIframe = await captureNextIframe();
        failNextRpcWithIdbFatal(secondIframe);

        await expect(getKeyPromise).rejects.toThrow(
            'Device signer IDB fatal error on "getKey" persisted after iframe reload'
        );
    });

    it("does not reload the iframe when the RPC succeeds on the first attempt", async () => {
        const storage = new IframeDeviceSignerKeyStorage(API_KEY);

        const iframePromise = captureNextIframe();
        const getKeyPromise = storage.getKey("0xaddress");

        const iframe = await iframePromise;
        respondToNextRpc(iframe, () => ({ publicKeyBase64: "first-try-key" }));

        await expect(getKeyPromise).resolves.toBe("first-try-key");
    });
});
