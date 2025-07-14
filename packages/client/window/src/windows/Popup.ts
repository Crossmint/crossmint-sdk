import { CreatePopupStrategy } from "@/utils/popupStrategy";
import { urlToOrigin } from "@/utils/urlToOrigin";

import type { EventMap } from "../EventEmitter";
import type { EventEmitterWithHandshakeOptions } from "../handshake";
import { HandshakeParent } from "../handshake/Parent";
import { WindowTransport } from "../transport/WindowTransport";
import { safeUrl } from "@/utils/safeUrl";

export interface PopupWindowOptions {
    width: number;
    height: number;
    crossOrigin?: boolean;
    awaitToLoad?: boolean;
}

export class PopupWindow<IncomingEvents extends EventMap, OutgoingEvents extends EventMap> extends HandshakeParent<
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
        options: PopupWindowOptions & EventEmitterWithHandshakeOptions<IncomingEvents, OutgoingEvents>
    ) {
        const popup = await createPopup(url, options);
        return new PopupWindow<IncomingEvents, OutgoingEvents>(
            popup,
            options?.targetOrigin || urlToOrigin(url),
            options
        );
    }

    static initSync<IncomingEvents extends EventMap, OutgoingEvents extends EventMap>(
        url: string,
        options: PopupWindowOptions & EventEmitterWithHandshakeOptions<IncomingEvents, OutgoingEvents>
    ) {
        const popup = createPopupSync(url, options);
        return new PopupWindow<IncomingEvents, OutgoingEvents>(
            popup,
            options.targetOrigin || urlToOrigin(url),
            options
        );
    }
}

function createPopupSync(url: string, options: PopupWindowOptions) {
    const _window = window.open(
        safeUrl(url),
        "popupWindow",
        createPopupString(options.width, options.height, options?.crossOrigin || false)
    );
    if (!_window) {
        throw new Error("Failed to open popup window");
    }
    return _window;
}

function createPopup(url: string, options: PopupWindowOptions) {
    const _window = createPopupSync(url, options);
    if (options.awaitToLoad === false) {
        return _window;
    }
    return new Promise<Window>((resolve, reject) => {
        _window.onload = () => resolve(_window);
        _window.onerror = () => reject("Failed to load popup window");
    });
}

function createPopupString(width: number, height: number, crossOrigin: boolean): string {
    const createPopupStrategy = new CreatePopupStrategy(crossOrigin);

    // In newer versions of chrome (>99) you need to add the `popup=true` for the new window to actually open in a popup
    const chromeVersion = getChromeVersion();
    const chromeVersionGreaterThan99 = chromeVersion != null && chromeVersion > 99;
    const popupStringBase = isFirefox() || chromeVersionGreaterThan99 ? "popup=true," : "";

    return `${popupStringBase}height=${height},width=${width},left=${createPopupStrategy.getLeft(
        width
    )},top=${createPopupStrategy.getTop(
        height
    )},resizable=yes,scrollbars=yes,toolbar=yes,menubar=true,location=no,directories=no,status=yes`;
}

function getChromeVersion() {
    const raw = navigator.userAgent.match(/Chrom(e|ium)\/([0-9]+)\./);
    return raw ? parseInt(raw[2]) : null;
}
function isFirefox() {
    return navigator.userAgent.toLowerCase().indexOf("firefox") > -1;
}
