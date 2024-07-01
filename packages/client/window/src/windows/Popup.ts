import { urlToOrigin } from "@/utils/urlToOrigin";

import { EventMap } from "../EventEmitter";
import { EventEmitterWithHandshakeOptions } from "../handshake";
import { HandshakeParent } from "../handshake/Parent";

export interface PopupWindowOptions {
    width: number;
    height: number;
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
        super(window, targetOrigin, options);
    }

    static async init<IncomingEvents extends EventMap, OutgoingEvents extends EventMap>(
        url: string,
        options: PopupWindowOptions & EventEmitterWithHandshakeOptions<IncomingEvents, OutgoingEvents>
    ) {
        return new PopupWindow<IncomingEvents, OutgoingEvents>(
            await createPopup(url, options),
            options?.targetOrigin || urlToOrigin(url),
            options
        );
    }
}

async function createPopup(url: string, options: PopupWindowOptions): Promise<Window> {
    const _window = window.open(url, "popupWindow", createPopupString(options.width, options.height));
    if (!_window) {
        throw new Error("Failed to open popup window");
    }

    return _window;
}

function createPopupString(width: number, height: number): string {
    function getLeft() {
        try {
            return window?.top != null
                ? window.top.outerWidth / 2 + window.top.screenX - width / 2
                : window.outerWidth / 2 + window.screenX - width / 2;
        } catch (e) {
            console.error(e);
        }

        return window.outerWidth / 2 + window.screenX - width / 2;
    }

    function getTop() {
        try {
            return window?.top != null
                ? window.top.outerHeight / 2 + window.top.screenY - height / 2
                : window.outerHeight / 2 + window.screenY - height / 2;
        } catch (e) {
            console.error(e);
        }

        return window.outerHeight / 2 + window.screenY - height / 2;
    }

    function getChromeVersion() {
        const raw = navigator.userAgent.match(/Chrom(e|ium)\/([0-9]+)\./);
        return raw ? parseInt(raw[2]) : null;
    }
    function isFirefox() {
        return navigator.userAgent.toLowerCase().indexOf("firefox") > -1;
    }

    // In newer versions of chrome (>99) you need to add the `popup=true` for the new window to actually open in a popup
    const chromeVersion = getChromeVersion();
    const chromeVersionGreaterThan99 = chromeVersion != null && chromeVersion > 99;
    const popupStringBase = isFirefox() || chromeVersionGreaterThan99 ? "popup=true," : "";

    return `${popupStringBase}height=${height},width=${width},left=${getLeft()},top=${getTop()},resizable=yes,scrollbars=yes,toolbar=yes,menubar=true,location=no,directories=no,status=yes`;
}
