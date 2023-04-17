import { PaymentElementSDKEvents } from "../models/events";
import { CheckoutEvents } from "../models/events";
import {
    EventCallbackFunction,
    ParamsUpdatePayload,
    PaymentElement,
} from "../models/paymentElement";
import { getEnvironmentBaseUrl } from "../utils";

export function crossmintPaymentService({
    clientId,
    uiConfig,
    recipient,
    environment,
    mintConfig,
    locale,
}: PaymentElement) {
    const baseUrl = getEnvironmentBaseUrl(environment);
    let listeners: Array<EventCallbackFunction> = [];

    function getIframeUrl() {
        const params = new URLSearchParams({
            clientId,
        });

        if (uiConfig != null) {
            params.append("uiConfig", JSON.stringify(uiConfig));
        }

        if (recipient != null) {
            params.append("recipient", JSON.stringify(recipient));
        }

        if (mintConfig != null) {
            params.append("mintConfig", JSON.stringify(mintConfig));
        }

        if (locale != null) {
            params.append("locale", locale);
        }

        return `${baseUrl}/sdk/paymentElement?${params.toString()}`;
    }

    function listenToEvents(
        cb: EventCallbackFunction
    ) {
        const eventListener = (event: MessageEvent) => {
            if (event.origin !== baseUrl) {
                return;
            }

            if (Object.values(CheckoutEvents).includes(event.data.type)) {
                cb(event);
            }
        };

        window.addEventListener("message", eventListener);
        listeners.push(eventListener);
    }

    function removeEventListeners() {
        listeners.forEach((listener) => {
            window.removeEventListener("message", listener);
        });
        listeners = [];
    }

    function emitQueryParams(payload: ParamsUpdatePayload) {
        const iframe = document.getElementById("iframe-crossmint-payment-element") as HTMLIFrameElement;
        iframe?.contentWindow?.postMessage({ type: PaymentElementSDKEvents.PARAMS_UPDATE, payload }, baseUrl);
    }

    return {
        getIframeUrl,
        listenToEvents,
        emitQueryParams,
        removeEventListeners,
    };
}
