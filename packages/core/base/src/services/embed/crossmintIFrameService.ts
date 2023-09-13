import { embeddedCheckoutIFrameId } from "@/consts";
import {
    CrossmintEmbeddedCheckoutProps,
    CrossmintEvent,
    CrossmintEvents,
    CrossmintInternalEvent,
    CrossmintInternalEvents,
    OutgoingInternalEvents,
} from "@/types";

import { getEnvironmentBaseUrl, isFiatEmbeddedCheckoutProps } from "../../utils";

export function crossmintIFrameService(props: CrossmintEmbeddedCheckoutProps) {
    const targetOrigin = getEnvironmentBaseUrl(props.environment);

    function getUrl(props: CrossmintEmbeddedCheckoutProps) {
        const path = isFiatEmbeddedCheckoutProps(props) ? "/sdk/paymentElement" : "/sdk/2023-06-09/embeddedCheckout"; // TODO: v2.0 - remove '/sdk/paymentElement'

        const queryParams = new URLSearchParams();

        const paramsToExclude = ["environment"];

        let key: keyof CrossmintEmbeddedCheckoutProps;
        for (key in props) {
            const value = props[key] as unknown;

            if (!value || typeof value === "function" || paramsToExclude.includes(key)) {
                continue;
            }
            if (typeof value === "object") {
                queryParams.append(key, JSON.stringify(value));
            } else if (typeof value === "string") {
                if (value === "undefined") {
                    continue;
                }
                queryParams.append(key, value);
            } else if (["boolean", "number"].includes(typeof value)) {
                queryParams.append(key, value.toString());
            }
        }

        return `${targetOrigin}${path}?${queryParams.toString()}`;
    }

    function _listenToEvents<EP = CrossmintEvent | CrossmintInternalEvent>(
        callback: (event: MessageEvent<EP>) => void,
        validEventTypes: {
            [key: string]: CrossmintEvents | CrossmintInternalEvents;
        }
    ) {
        function _onEvent(event: MessageEvent) {
            if (event.origin !== targetOrigin) {
                console.log("[Crossmint] Received event from invalid origin", event.origin, targetOrigin);
                return;
            }
            if (Object.values(validEventTypes).includes(event.data.type)) {
                callback(event);
            }
        }

        window.addEventListener("message", _onEvent);
        return () => {
            window.removeEventListener("message", _onEvent);
        };
    }

    const listenToEvents = (callback: (event: MessageEvent<CrossmintEvent>) => void) =>
        _listenToEvents(callback, CrossmintEvents);
    const listenToInternalEvents = (callback: (event: MessageEvent<CrossmintInternalEvent>) => void) =>
        _listenToEvents(callback, CrossmintInternalEvents);

    function emitInternalEvent(event: OutgoingInternalEvents) {
        const iframe = document.getElementById(embeddedCheckoutIFrameId) as HTMLIFrameElement | null;
        if (iframe == null) {
            console.error("[Crossmint] Failed to find crossmint-embedded-checkout.iframe");
            return;
        }
        try {
            iframe.contentWindow?.postMessage(event, targetOrigin);
        } catch (e) {
            console.error("[Crossmint] Failed to emit internal event", event, e);
        }
    }

    return {
        getUrl,
        listenToEvents,
        listenToInternalEvents,
        emitInternalEvent,
    };
}
