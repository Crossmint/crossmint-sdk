import { PaymentElement, Recipient } from "../models/paymentElement";
import { getEnvironmentBaseUrl } from "../utils";

export function crossmintPaymentService({ clientId, uiConfig, recipient, environment, mintArgs }: PaymentElement) {
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

        if (mintArgs != null) {
            params.append("mintArgs", JSON.stringify(mintArgs));
        }

        return `${baseUrl}/sdk/paymentElement?${params.toString()}`;
    }

    function listenToEvents(cb: (event: MessageEvent<any>) => void) {
        window.addEventListener("message", (event) => {
            if (event.origin !== baseUrl) {
                return;
            }

            cb(event);
        });
    }

    function emitRecipient(recipient?: Recipient) {
        if (recipient == null) {
            return;
        }

        const iframe = document.getElementById("iframe-crossmint-payment-element") as HTMLIFrameElement;
        iframe?.contentWindow?.postMessage({ type: "queryParamsUpdate", payload: recipient }, baseUrl);
    }

    return {
        getIframeUrl,
        listenToEvents,
        emitRecipient,
    };
}
