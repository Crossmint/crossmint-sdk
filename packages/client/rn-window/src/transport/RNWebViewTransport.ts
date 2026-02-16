import "../polyfills";
import type { z } from "zod";
import type { WebViewMessageEvent, WebView } from "react-native-webview";
import type { EventMap, SimpleMessageEvent, Transport } from "@crossmint/client-sdk-window";
import { generateRandomString } from "@crossmint/client-sdk-window";
import type { RefObject } from "react";

export class RNWebViewTransport<OutgoingEvents extends EventMap = EventMap> implements Transport<OutgoingEvents> {
    private listeners = new Map<string, (event: SimpleMessageEvent) => void>();
    private isWebView: boolean;
    private globalListenerAttached = false;

    constructor(private webviewRef?: RefObject<WebView | null>) {
        this.isWebView = typeof (window as any).ReactNativeWebView !== "undefined";
    }

    private handleGlobalMessage = (event: MessageEvent) => {
        const eventName = event.data?.event;
        if (eventName) {
            console.info(`[RNTransport WebView] received: ${String(eventName)}`);
        }
        this.dispatchToListeners({
            type: "message",
            data: event.data,
        });
    };

    private dispatchToListeners(event: SimpleMessageEvent) {
        for (const listener of this.listeners.values()) {
            try {
                listener(event);
            } catch (e) {
                console.error(`[RNTransport ${this.isWebView ? "WebView" : "RN"}] Error in listener:`, e);
            }
        }
    }

    send<K extends keyof OutgoingEvents>(message: { event: K; data: z.infer<OutgoingEvents[K]> }): void {
        if (this.isWebView) {
            if ((window as any).ReactNativeWebView?.postMessage) {
                (window as any).ReactNativeWebView.postMessage(JSON.stringify(message));
            } else {
                console.error("[RNTransport WebView] ReactNativeWebView.postMessage not available");
            }
        } else {
            if (this.webviewRef?.current?.injectJavaScript) {
                const messageStr = JSON.stringify(message);
                // The way to send message to RN is to inject a script into the WebView
                const script = `
                    (function() {
                        if (window.onMessageFromRN) {
                            window.onMessageFromRN(${JSON.stringify(messageStr)});
                        } else {
                            console.error("[RN] onMessageFromRN not found");
                        }
                        true;
                    })()
                `;
                this.webviewRef.current.injectJavaScript(script);
            } else {
                console.warn("[RNTransport RN] WebView ref not available for injection");
            }
        }
    }

    addMessageListener(listener: (event: SimpleMessageEvent) => void): string {
        const id = generateRandomString();
        this.listeners.set(id, listener);

        if (this.isWebView && !this.globalListenerAttached) {
            window.addEventListener("message", this.handleGlobalMessage);
            this.globalListenerAttached = true;
        }

        return id;
    }

    removeMessageListener(id: string): void {
        const listener = this.listeners.get(id);
        if (listener != null) {
            this.listeners.delete(id);
        }

        if (this.isWebView && this.globalListenerAttached && this.listeners.size === 0) {
            window.removeEventListener("message", this.handleGlobalMessage);
            this.globalListenerAttached = false;
        }
    }

    public handleMessage = (event: WebViewMessageEvent) => {
        if (!this.isWebView) {
            try {
                const data = event.nativeEvent.data;

                // Handle plain string messages like "frame-ready"
                if (data === "frame-ready") {
                    // Frame is ready, no need to parse as JSON
                    return;
                }

                const parsedData = JSON.parse(data);
                const eventName = parsedData?.event;
                if (eventName) {
                    console.info(`[RNTransport RN] received from WebView: ${String(eventName)}`);
                }
                this.dispatchToListeners({
                    type: "message",
                    data: parsedData,
                });
            } catch (error) {
                console.error(
                    "[RNTransport RN] Error parsing/handling WebView message:",
                    error instanceof Error ? error.message : String(error),
                    "Raw data:",
                    event.nativeEvent.data
                );
            }
        }
    };

    /**
     * Reloads the WebView. Only available when running in React Native (not inside the WebView).
     */
    public reload(): void {
        if (this.isWebView) {
            return;
        }

        if (this.webviewRef?.current?.reload) {
            this.webviewRef.current.reload();
        } else {
            console.error("[RNTransport RN] WebView ref not available for reload");
        }
    }
}
