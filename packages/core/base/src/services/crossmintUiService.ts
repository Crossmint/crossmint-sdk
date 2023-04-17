import { UiEvents } from "../models/events";
import { getEnvironmentBaseUrl } from "../utils";

export function crossmintUiService({ environment }: { environment?: string } = {}) {
    const baseUrl = getEnvironmentBaseUrl(environment);
    let listeners: Array<(event: MessageEvent) => void> = [];

    function listenToEvents(cb: (event: MessageEvent) => void) {
        const eventListener = (event: MessageEvent) => {
            if (event.origin !== baseUrl) {
                return;
            }

            if (Object.values(UiEvents).includes(event.data.type)) {
                cb(event);
            }
        }
        window.addEventListener("message", eventListener);
        listeners.push(eventListener);
    }

    function removeEventListeners() {
        listeners.forEach((listener) => {
            window.removeEventListener("message", listener);
        });
        listeners = [];
    }

    return {
        listenToEvents,
        removeEventListeners,
    };
}
