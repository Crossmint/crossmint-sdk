import {
    CrossmintEmbeddedCheckoutProps,
    CrossmintEventUnion,
    CrossmintEvents,
    CrossmintInternalEventUnion,
    CrossmintInternalEvents,
} from "@/types";

import { getEnvironmentBaseUrl, isFiatEmbeddedCheckoutProps } from "../../utils";

// TODO: Emit updatable parameters
export function crossmintIFrameService(props: CrossmintEmbeddedCheckoutProps) {
    return {
        getUrl,
        listenToEvents,
        listenToInternalEvents,
    };
}

function getUrl(props: CrossmintEmbeddedCheckoutProps) {
    const baseUrl = getEnvironmentBaseUrl(props.environment);
    const path = isFiatEmbeddedCheckoutProps(props) ? "/sdk/paymentElement" : "/sdk/2023-06-09/embeddedCheckout"; // TODO: v2.0 - remove '/sdk/paymentElement'

    const queryParams = new URLSearchParams();

    let key: keyof CrossmintEmbeddedCheckoutProps;
    for (key in props) {
        const value = props[key] as unknown;

        if (!value || typeof value === "function") {
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

    return `${baseUrl}${path}?${queryParams.toString()}`;
}

function _listenToEvents<EP = CrossmintEventUnion | CrossmintInternalEventUnion>(
    callback: (event: MessageEvent<EP>) => void,
    validEventTypes: {
        [key: string]: CrossmintEvents | CrossmintInternalEvents;
    }
) {
    function _onEvent(event: MessageEvent) {
        if (event.origin !== window.origin) {
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

const listenToEvents = (callback: (event: MessageEvent<CrossmintEventUnion>) => void) =>
    _listenToEvents(callback, CrossmintEvents);
const listenToInternalEvents = (callback: (event: MessageEvent<CrossmintInternalEventUnion>) => void) =>
    _listenToEvents(callback, CrossmintInternalEvents);
