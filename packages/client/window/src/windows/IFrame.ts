import { urlToOrigin } from "@/utils/urlToOrigin";

import { EventMap } from "../EventEmitter";
import { EventEmitterWithHandshakeOptions } from "../handshake";
import { HandshakeParent } from "../handshake/Parent";

export class IFrameWindow<IncomingEvents extends EventMap, OutgoingEvents extends EventMap> extends HandshakeParent<
    IncomingEvents,
    OutgoingEvents
> {
    iframe: HTMLIFrameElement;
    targetOrigin: string;

    private constructor(
        iframe: HTMLIFrameElement,
        targetOrigin: string,
        options?: EventEmitterWithHandshakeOptions<IncomingEvents, OutgoingEvents>
    ) {
        const contentWindow = iframe.contentWindow;
        if (!contentWindow) {
            throw new Error("IFrame must have a contentWindow");
        }
        super(contentWindow, targetOrigin, options);

        this.iframe = iframe;
        this.targetOrigin = targetOrigin;
    }

    static async init<IncomingEvents extends EventMap, OutgoingEvents extends EventMap>(
        url: string,
        options?: EventEmitterWithHandshakeOptions<IncomingEvents, OutgoingEvents> & {
            existingIFrame?: HTMLIFrameElement;
        }
    ) {
        return new IFrameWindow<IncomingEvents, OutgoingEvents>(
            options?.existingIFrame || (await createIFrame(url)),
            urlToOrigin(url),
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
