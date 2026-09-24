import { afterEach, describe, expect, test, vi } from "vitest";
import { getRNWebViewPostMessage, isRNWebViewHost } from "./rnWebViewHost";

type MutableWindow = Window & {
    ReactNativeWebView?: { postMessage: (message: string) => void };
    webkit?: { messageHandlers?: Record<string, { postMessage: (message: string) => void }> };
};
const win = window as MutableWindow;

describe("rnWebViewHost", () => {
    afterEach(() => {
        delete win.ReactNativeWebView;
        delete win.webkit;
    });

    describe("when neither the shim nor a native handler exists", () => {
        test("reports no React Native host", () => {
            expect(isRNWebViewHost()).toBe(false);
            expect(getRNWebViewPostMessage()).toBeUndefined();
        });
    });

    describe("when the injected ReactNativeWebView shim exists", () => {
        test("posts through the shim", () => {
            const postMessage = vi.fn();
            win.ReactNativeWebView = { postMessage };

            getRNWebViewPostMessage()?.("payload");

            expect(isRNWebViewHost()).toBe(true);
            expect(postMessage).toHaveBeenCalledWith("payload");
        });
    });

    describe("when only the native WebKit handler exists (react-native-webview with enableApplePay)", () => {
        test("posts through webkit.messageHandlers.ReactNativeWebView", () => {
            const postMessage = vi.fn();
            win.webkit = { messageHandlers: { ReactNativeWebView: { postMessage } } };

            getRNWebViewPostMessage()?.("payload");

            expect(isRNWebViewHost()).toBe(true);
            expect(postMessage).toHaveBeenCalledWith("payload");
        });
    });

    describe("when both exist", () => {
        test("prefers the shim", () => {
            const shim = vi.fn();
            const native = vi.fn();
            win.ReactNativeWebView = { postMessage: shim };
            win.webkit = { messageHandlers: { ReactNativeWebView: { postMessage: native } } };

            getRNWebViewPostMessage()?.("payload");

            expect(shim).toHaveBeenCalledWith("payload");
            expect(native).not.toHaveBeenCalled();
        });
    });
});
