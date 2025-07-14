import { urlToOrigin } from "@/utils/urlToOrigin";

import type { EventMap } from "../EventEmitter";
import type { EventEmitterWithHandshakeOptions } from "../handshake";
import { HandshakeParent } from "../handshake/Parent";
import { WindowTransport } from "../transport/WindowTransport";
import { safeUrl } from "@/utils/safeUrl";

export interface NewTabWindowOptions {
    awaitToLoad?: boolean;
}

export class NewTabWindow<IncomingEvents extends EventMap, OutgoingEvents extends EventMap> extends HandshakeParent<
    IncomingEvents,
    OutgoingEvents
> {
    private constructor(
        public window: Window,
        targetOrigin: string,
        options?: EventEmitterWithHandshakeOptions<IncomingEvents, OutgoingEvents>
    ) {
        const transport = new WindowTransport<OutgoingEvents>(window, targetOrigin);
        super(transport, options);
    }

    static async init<IncomingEvents extends EventMap, OutgoingEvents extends EventMap>(
        url: string,
        options: NewTabWindowOptions & EventEmitterWithHandshakeOptions<IncomingEvents, OutgoingEvents>
    ) {
        const popup = await createNewTab(url, options);
        return new NewTabWindow<IncomingEvents, OutgoingEvents>(
            popup,
            options?.targetOrigin || urlToOrigin(url),
            options
        );
    }

    static initSync<IncomingEvents extends EventMap, OutgoingEvents extends EventMap>(
        url: string,
        options: EventEmitterWithHandshakeOptions<IncomingEvents, OutgoingEvents>
    ) {
        const popup = createNewTabSync(url);
        return new NewTabWindow<IncomingEvents, OutgoingEvents>(
            popup,
            options.targetOrigin || urlToOrigin(url),
            options
        );
    }
}

function createNewTabSync(url: string) {
    const _window = window.open(safeUrl(url), "_blank", "noopener,noreferrer");
    if (!_window) {
        throw new Error("Failed to open new tab window");
    }
    return _window;
}

function createNewTab(url: string, options: NewTabWindowOptions) {
    const _window = createNewTabSync(url);
    if (options.awaitToLoad === false) {
        return _window;
    }
    return new Promise<Window>((resolve, reject) => {
        _window.onload = () => resolve(_window);
        _window.onerror = () => reject("Failed to load new tab window");
    });
}
