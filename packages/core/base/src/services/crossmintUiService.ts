import {UiEvents} from "../models/events";
import {getEnvironmentBaseUrl} from "../utils";

export function crossmintUiService({environment}: { environment?: string } = {}) {
    const baseUrl = getEnvironmentBaseUrl(environment);

    function listenToEvents(cb: (event: MessageEvent) => void): () => void {
        function _internalOnEvent(event: MessageEvent<any>) {
            if (event.origin !== baseUrl) {
                return;
            }

            if (Object.values(UiEvents).includes(event.data.type)) {
                cb(event);
            }
        }

        window.addEventListener("message", _internalOnEvent);

        return () => {
            window.removeEventListener("message", _internalOnEvent);
        }
    }

    return {
        listenToEvents,
    };
}
