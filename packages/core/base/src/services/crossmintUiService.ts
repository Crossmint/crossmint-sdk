import { UiEvents } from "../models/events";
import { getEnvironmentBaseUrl } from "../utils";

export function crossmintUiService({ environment }: { environment?: string } = {}) {
    const baseUrl = getEnvironmentBaseUrl(environment);

    function listenToEvents(cb: (event: MessageEvent) => void) {
        window.addEventListener("message", (event) => {
            if (event.origin !== baseUrl) {
                return;
            }

            if (Object.values(UiEvents).includes(event.data.type)) {
                cb(event);
            }
        });
    }

    return {
        listenToEvents,
    };
}
