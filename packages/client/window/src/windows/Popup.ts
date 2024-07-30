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
        const popup = await createPopup(url, options);
        return new PopupWindow<IncomingEvents, OutgoingEvents>(
            popup,
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

    return new Promise((resolve, reject) => {
        _window.onload = () => resolve(_window);
        _window.onerror = () => reject("Failed to load popup window");
    });
}

function createPopupString(width: number, height: number): string {
    const createPopupStrategy = new CreatePopupStrategy();

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

interface CreatePopupService {
    getTop(height: number): number;
    getLeft(width: number): number;
}
class CreatePopupStrategy {
    protected createPopupService: CreatePopupService;

    constructor() {
        this.createPopupService = this.isCrossmintOrigin() ? new CrossmintService() : new CrossOriginService();
    }

    private isCrossmintOrigin(): boolean {
        try {
            const url = new URL(window.location.origin);
            return url.hostname.endsWith("crossmint.com");
        } catch (e) {
            console.error("Invalid URL", e);
            return false;
        }
    }

    getTop(height: number): number {
        return this.createPopupService.getTop(height);
    }

    getLeft(width: number): number {
        return this.createPopupService.getLeft(width);
    }
}

class CrossOriginService implements CreatePopupService {
    getTop(height: number): number {
        return (screen.height - height) / 2;
    }
    getLeft(width: number): number {
        return (screen.width - width) / 2;
    }
}

class CrossmintService implements CreatePopupService {
    getTop(height: number): number {
        return window?.top != null
            ? window.top.outerHeight / 2 + window.top.screenY - height / 2
            : window.outerHeight / 2 + window.screenY - height / 2;
    }
    getLeft(width: number): number {
        return window?.top != null
            ? window.top.outerWidth / 2 + window.top.screenX - width / 2
            : window.outerWidth / 2 + window.screenX - width / 2;
    }
}
