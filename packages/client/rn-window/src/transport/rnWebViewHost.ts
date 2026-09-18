// Handler name registered natively by react-native-webview on iOS. When `enableApplePay` is set, WKWebView
// forbids user scripts so the `window.ReactNativeWebView` shim is never injected, but this native
// WKScriptMessageHandler still exists and is the only way to reach the host app.
export const RN_WEBVIEW_MESSAGE_HANDLER = "ReactNativeWebView";

type PostMessage = (message: string) => void;

interface RNWebViewGlobals {
    ReactNativeWebView?: { postMessage?: PostMessage };
    webkit?: { messageHandlers?: Record<string, { postMessage: PostMessage } | undefined> };
}

function getGlobals(): RNWebViewGlobals | undefined {
    if (typeof window === "undefined") {
        return undefined;
    }
    return window as unknown as RNWebViewGlobals;
}

export function getRNWebViewPostMessage(): PostMessage | undefined {
    const globals = getGlobals();

    const shim = globals?.ReactNativeWebView;
    if (shim?.postMessage != null) {
        return (message) => shim.postMessage?.(message);
    }

    const nativeHandler = globals?.webkit?.messageHandlers?.[RN_WEBVIEW_MESSAGE_HANDLER];
    if (nativeHandler != null) {
        return (message) => nativeHandler.postMessage(message);
    }

    return undefined;
}

export function isRNWebViewHost(): boolean {
    return getRNWebViewPostMessage() != null;
}
