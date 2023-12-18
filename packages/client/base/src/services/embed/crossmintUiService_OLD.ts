import { CrossmintInternalEvents } from "@/types/events";
import { getEnvironmentBaseUrl } from "@/utils";

export function crossmintUiService_OLD({ environment }: { environment?: string } = {}) {
    const baseUrl = getEnvironmentBaseUrl(environment);

    function listenToEvents(cb: (event: MessageEvent) => void): () => void {
        function _internalOnEvent(event: MessageEvent<any>) {
            if (event.origin !== baseUrl) {
                return;
            }

            if (Object.values(CrossmintInternalEvents).includes(event.data.type)) {
                cb(event);
            }
        }

        window.addEventListener("message", _internalOnEvent);

        return () => {
            window.removeEventListener("message", _internalOnEvent);
        };
    }

    return {
        listenToEvents,
    };
}
