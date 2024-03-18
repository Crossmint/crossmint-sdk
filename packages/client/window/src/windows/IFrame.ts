import { urlToOrigin } from "@/utils/urlToOrigin";

import { EventMap } from "../EventEmitter";
import { EventEmitterWithHandshakeOptions } from "../handshake";
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
        url: string,
        options?: EventEmitterWithHandshakeOptions<IncomingEvents, OutgoingEvents>
    ) {
        return new IFrameWindow<IncomingEvents, OutgoingEvents>(
            await createIFrame(url),
            options?.targetOrigin || urlToOrigin(url),
            options
        );
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
