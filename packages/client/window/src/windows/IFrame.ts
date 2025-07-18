import { urlToOrigin } from "@/utils/urlToOrigin";

import type { EventMap } from "../EventEmitter";
import type { EventEmitterWithHandshakeOptions } from "../handshake";
import { HandshakeParent } from "../handshake/Parent";
import { WindowTransport } from "../transport/WindowTransport";
import type { Transport } from "../transport/Transport";

type TransportClassConstructor<OutgoingEvents extends EventMap> = new (
    otherWindow: Window,
    targetOrigin: string | string[]
) => Transport<OutgoingEvents>;

export class IFrameWindow<IncomingEvents extends EventMap, OutgoingEvents extends EventMap> extends HandshakeParent<
    IncomingEvents,
    OutgoingEvents
> {
    private constructor(
        public iframe: HTMLIFrameElement,
        targetOrigin: string,
        options?: EventEmitterWithHandshakeOptions<IncomingEvents, OutgoingEvents>,
        TransportClass: TransportClassConstructor<OutgoingEvents> = WindowTransport
    ) {
        const contentWindow = iframe.contentWindow;
        if (!contentWindow) {
            throw new Error("IFrame must have a contentWindow");
        }
        const transport = new TransportClass(contentWindow, targetOrigin);
        super(transport, options);
    }

    static async init<IncomingEvents extends EventMap, OutgoingEvents extends EventMap>(
        urlOrExistingIframe: string | HTMLIFrameElement,
        options?: EventEmitterWithHandshakeOptions<IncomingEvents, OutgoingEvents>,
        TransportClass: TransportClassConstructor<OutgoingEvents> = WindowTransport
    ) {
        const iframe =
            typeof urlOrExistingIframe === "string" ? await createIFrame(urlOrExistingIframe) : urlOrExistingIframe;
        const targetOrigin = options?.targetOrigin || urlToOrigin(iframe.src);
        return new IFrameWindow<IncomingEvents, OutgoingEvents>(iframe, targetOrigin, options, TransportClass);
    }

    static initExistingIFrame<IncomingEvents extends EventMap, OutgoingEvents extends EventMap>(
        iframe: HTMLIFrameElement,
        options?: EventEmitterWithHandshakeOptions<IncomingEvents, OutgoingEvents>,
        TransportClass: TransportClassConstructor<OutgoingEvents> = WindowTransport
    ) {
        const targetOrigin = options?.targetOrigin || urlToOrigin(iframe.src);
        return new IFrameWindow<IncomingEvents, OutgoingEvents>(iframe, targetOrigin, options, TransportClass);
    }
}

async function createIFrame(url: string): Promise<HTMLIFrameElement> {
    const iframe = document.createElement("iframe");
    iframe.src = url;

    return new Promise((resolve, reject) => {
        iframe.onload = () => resolve(iframe);
        iframe.onerror = () => reject("Failed to load iframe content");

        document.body.appendChild(iframe);
    });
}
