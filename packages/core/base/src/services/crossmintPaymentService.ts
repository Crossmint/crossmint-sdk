import { PaymentElement, Recipient } from "../models/paymentElement";
import { getEnvironmentBaseUrl } from "../utils";

export function crossmintPaymentService({ clientId, uiConfig, recipient, environment }: PaymentElement) {
    const baseUrl = getEnvironmentBaseUrl(environment);

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

        return `${baseUrl}/sdk/paymentElement?${params.toString()}`;
    }

    // TODO: Type to expect from crossbit main
    function listenToEvents(cb: (event: any) => void) {
        window.addEventListener("message", (event) => {
            if (event.origin !== baseUrl) {
                return;
            }

            console.log("listenToEvents", event);

            cb(event);
        });
    }

    function emitRecipient(recipient?: Recipient) {
        if (recipient == null) {
            return;
        }

        const iframe = document.getElementById("iframe-crossmint-payment-element") as any;
        if (iframe == null) {
            return;
        }

        iframe.contentWindow.postMessage({ type: "queryParamsUpdate", payload: recipient }, baseUrl);
    }

    return {
        getIframeUrl,
        listenToEvents,
        emitRecipient,
    };
}
