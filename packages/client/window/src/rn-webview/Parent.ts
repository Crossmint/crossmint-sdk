import { RNWebViewTransport } from "@/transport/RNWebViewTransport";
import type { EventMap } from "../EventEmitter";
import type { EventEmitterWithHandshakeOptions } from "../handshake";
import { HandshakeParent } from "../handshake/Parent";
import type { RefObject } from "react";
import type { WebView, WebViewMessageEvent } from "react-native-webview";

export class WebViewParent<IncomingEvents extends EventMap, OutgoingEvents extends EventMap> extends HandshakeParent<
    IncomingEvents,
    OutgoingEvents
> {
    /**
     * @param webviewRef A React ref to the WebView component
     * @param options Optional EventEmitter and handshake options
     */
    constructor(
        webviewRef: RefObject<WebView>,
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
        if (this.transport instanceof RNWebViewTransport) {
            this.transport.handleMessage(event);
        }
    };
}
