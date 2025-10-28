import type { EventMap, EventEmitterWithHandshakeOptions } from "@crossmint/client-sdk-window";
import { HandshakeParent } from "@crossmint/client-sdk-window";
import type { RefObject } from "react";
import type { WebView, WebViewMessageEvent } from "react-native-webview";
import { RNWebViewTransport } from "../transport/RNWebViewTransport";

export class WebViewParent<IncomingEvents extends EventMap, OutgoingEvents extends EventMap> extends HandshakeParent<
    IncomingEvents,
    OutgoingEvents
> {
    protected transport: RNWebViewTransport<OutgoingEvents>;

    /**
     * @param webviewRef A React ref to the WebView component
     * @param options Optional EventEmitter and handshake options
     */
    constructor(
        webviewRef: RefObject<WebView | null>,
        options?: EventEmitterWithHandshakeOptions<IncomingEvents, OutgoingEvents>
    ) {
        const transport = new RNWebViewTransport<OutgoingEvents>(webviewRef);
        super(transport, options);
        this.transport = transport;
    }

    /**
     * Should be passed to the React Native WebView's onMessage prop to forward events into the transport
     */
    public handleMessage = (event: WebViewMessageEvent): void => {
        console.log("[WebViewParent] handleMessage() called");
        if (this.transport instanceof RNWebViewTransport) {
            this.transport.handleMessage(event);
        } else {
            console.error("[WebViewParent] Transport is not an instance of RNWebViewTransport");
        }
    };
}
