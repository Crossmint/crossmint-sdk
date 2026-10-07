// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MOCK_API_KEY } from "../../api/__tests__/constants";
import { IframeDeviceSignerKeyStorage } from "./IframeDeviceSignerKeyStorage";

const IFRAME_ORIGIN = "https://development.devicekey.store";

function setChromeUserAgent(): void {
    vi.stubGlobal("navigator", {
        userAgent:
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    });
}

let activeStorage: IframeDeviceSignerKeyStorage | undefined;
let iframeCreationCount = 0;
let pendingIframeResolvers: Array<(iframe: HTMLIFrameElement) => void> = [];

function createStorage(): IframeDeviceSignerKeyStorage {
    activeStorage = new IframeDeviceSignerKeyStorage(MOCK_API_KEY);
    return activeStorage;
}

function nextIframe(): Promise<HTMLIFrameElement> {
    return new Promise((resolve) => {
        pendingIframeResolvers.push(resolve);
    });
}

function installIframeTracking(): void {
    const originalCreateElement = document.createElement.bind(document);
    vi.spyOn(document, "createElement").mockImplementation((tagName: string) => {
        const element = originalCreateElement(tagName);
        if (tagName === "iframe") {
            iframeCreationCount++;
            element.addEventListener("load", () => pendingIframeResolvers.shift()?.(element as HTMLIFrameElement), {
                once: true,
            });
            queueMicrotask(() => element.dispatchEvent(new Event("load")));
        }
        return element;
    });
}

function respondToNextRpc(
    iframe: HTMLIFrameElement,
    respond: (message: { type: string; id: string; payload: Record<string, unknown> }) => unknown
) {
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
    return postMessage;
}

function failNextRpcWithIdbFatal(iframe: HTMLIFrameElement) {
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
    return postMessage;
}

describe("IframeDeviceSignerKeyStorage — recovers from a fatal IndexedDB error", () => {
    beforeEach(() => {
        setChromeUserAgent();
        iframeCreationCount = 0;
        pendingIframeResolvers = [];
        installIframeTracking();
    });

    afterEach(() => {
        activeStorage?.destroy();
        activeStorage = undefined;
        vi.restoreAllMocks();
        vi.unstubAllGlobals();
        document.body.innerHTML = "";
    });

    it("reloads the iframe once and retries after a fatal IDB error, resolving with the retried value", async () => {
        const storage = createStorage();

        const firstIframePromise = nextIframe();
        const getKeyPromise = storage.getKey("0xaddress");
        const firstIframe = await firstIframePromise;
        const firstPostMessage = failNextRpcWithIdbFatal(firstIframe);

        const secondIframe = await nextIframe();
        const secondPostMessage = respondToNextRpc(secondIframe, () => ({ publicKeyBase64: "recovered-key" }));

        await expect(getKeyPromise).resolves.toBe("recovered-key");

        expect(iframeCreationCount).toBe(2);
        expect(firstPostMessage).toHaveBeenCalledTimes(1);
        expect(firstPostMessage).toHaveBeenCalledWith(
            expect.objectContaining({ type: "getKey", payload: { address: "0xaddress" } }),
            IFRAME_ORIGIN
        );
        expect(secondPostMessage).toHaveBeenCalledTimes(1);
        expect(secondPostMessage).toHaveBeenCalledWith(
            expect.objectContaining({ type: "getKey", payload: { address: "0xaddress" } }),
            IFRAME_ORIGIN
        );
    });

    it("throws a named error when the fatal IDB error persists after the iframe reload", async () => {
        const storage = createStorage();

        const firstIframePromise = nextIframe();
        const getKeyPromise = storage.getKey("0xaddress");
        const firstIframe = await firstIframePromise;
        failNextRpcWithIdbFatal(firstIframe);

        const secondIframe = await nextIframe();
        const secondPostMessage = failNextRpcWithIdbFatal(secondIframe);

        await expect(getKeyPromise).rejects.toThrow(
            'Device signer IDB fatal error on "getKey" persisted after iframe reload'
        );

        expect(iframeCreationCount).toBe(2);
        expect(secondPostMessage).toHaveBeenCalledTimes(1);
    });

    it("keeps the original iframe when the RPC succeeds on the first attempt", async () => {
        const storage = createStorage();

        const iframePromise = nextIframe();
        const getKeyPromise = storage.getKey("0xaddress");

        const iframe = await iframePromise;
        const postMessage = respondToNextRpc(iframe, () => ({ publicKeyBase64: "first-try-key" }));

        await expect(getKeyPromise).resolves.toBe("first-try-key");

        expect(iframeCreationCount).toBe(1);
        expect(postMessage).toHaveBeenCalledTimes(1);
        expect(postMessage).toHaveBeenCalledWith(
            expect.objectContaining({ type: "getKey", payload: { address: "0xaddress" } }),
            IFRAME_ORIGIN
        );
    });
});
