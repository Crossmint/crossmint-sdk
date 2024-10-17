import { urlToOrigin } from "@/utils/urlToOrigin";

import type { EventMap } from "../EventEmitter";
import type { EventEmitterWithHandshakeOptions } from "../handshake";
import { HandshakeParent } from "../handshake/Parent";

export class IFrameWindow<IncomingEvents extends EventMap, OutgoingEvents extends EventMap> extends HandshakeParent<
    IncomingEvents,
    OutgoingEvents
> {
    private constructor(
        public iframe: HTMLIFrameElement,
        targetOrigin: string,
        options?: EventEmitterWithHandshakeOptions<IncomingEvents, OutgoingEvents>
    ) {
        const contentWindow = iframe.contentWindow;
        if (!contentWindow) {
            throw new Error("IFrame must have a contentWindow");
        }
        super(contentWindow, targetOrigin, options);
    }

    static async init<IncomingEvents extends EventMap, OutgoingEvents extends EventMap>(
        urlOrExistingIframe: string | HTMLIFrameElement,
        options?: EventEmitterWithHandshakeOptions<IncomingEvents, OutgoingEvents>
    ) {
        const iframe =
            typeof urlOrExistingIframe === "string" ? await createIFrame(urlOrExistingIframe) : urlOrExistingIframe;
        const targetOrigin = options?.targetOrigin || urlToOrigin(iframe.src);
        return new IFrameWindow<IncomingEvents, OutgoingEvents>(iframe, targetOrigin, options);
    }

    static initExistingIFrame<IncomingEvents extends EventMap, OutgoingEvents extends EventMap>(
        iframe: HTMLIFrameElement,
        options?: EventEmitterWithHandshakeOptions<IncomingEvents, OutgoingEvents>
    ) {
        const targetOrigin = options?.targetOrigin || urlToOrigin(iframe.src);
        return new IFrameWindow<IncomingEvents, OutgoingEvents>(iframe, targetOrigin, options);
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
