import { embeddedCheckoutIFrameId } from "@/consts";
import {
    type CrossmintEmbeddedCheckoutProps,
    type CrossmintEvent,
    CrossmintEvents,
    type CrossmintInternalEvent,
    type CrossmintInternalEvents,
    type IncomingInternalEvent,
    IncomingInternalEvents,
    type OutgoingInternalEvent,
} from "@/types";

import { getEnvironmentBaseUrl } from "../../utils";

export function crossmintIFrameService(props: CrossmintEmbeddedCheckoutProps) {
    const targetOrigin = getEnvironmentBaseUrl(props.environment);

    function getUrl(props: CrossmintEmbeddedCheckoutProps) {
        props = coerceCollectionIdToClientId(props);

        const path = "/sdk/2023-06-09/embeddedCheckout";

        const queryParams = new URLSearchParams();

        const paramsToExclude = ["environment"];

        let key: keyof CrossmintEmbeddedCheckoutProps;
        for (key in props) {
            const value = props[key] as unknown;

            if (!value || typeof value === "function" || paramsToExclude.includes(key)) {
                continue;
            }
            if (typeof value === "object") {
                queryParams.append(
                    key,
                    JSON.stringify(value, (key, val) => (typeof val === "function" ? "function" : val))
                );
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
    const listenToInternalEvents = (callback: (event: MessageEvent<IncomingInternalEvent>) => void) =>
        _listenToEvents(callback, IncomingInternalEvents);

    function emitInternalEvent(event: OutgoingInternalEvent) {
        const iframe = document.getElementById(embeddedCheckoutIFrameId) as HTMLIFrameElement | null;
        if (iframe == null) {
            console.error("[Crossmint] Failed to find crossmint-embedded-checkout.iframe");
            return;
        }
        try {
            console.log("[Crossmint] Emitting internal event", event);
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

function coerceCollectionIdToClientId(props: CrossmintEmbeddedCheckoutProps) {
    if ("collectionId" in props && props.collectionId) {
        return { ...props, clientId: props.collectionId, collectionId: undefined };
    }
    return props;
}
