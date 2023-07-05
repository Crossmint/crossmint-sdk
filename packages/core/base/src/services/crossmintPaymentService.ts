import { PaymentElementSDKEvents } from "../models/events";
import { CheckoutEvents } from "../models/events";
import {
    CheckoutEventMap,
    CrossmintCheckoutEvent,
    ParamsUpdatePayload,
    PaymentElement,
} from "../models/paymentElement";
import { getEnvironmentBaseUrl } from "../utils";

export function crossmintPaymentService(props: PaymentElement) {
    const clientId = "clientId" in props ? props.clientId : props.collectionId;
    const {
        uiConfig,
        recipient,
        environment,
        mintConfig,
        locale,
        whPassThroughArgs,
        cardWalletPaymentMethods,
        projectId,
    } = props;
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

        if (mintConfig != null) {
            params.append("mintConfig", JSON.stringify(mintConfig));
        }

        if (locale != null) {
            params.append("locale", locale);
        }

        if (whPassThroughArgs != null) {
            params.append("whPassThroughArgs", JSON.stringify(whPassThroughArgs));
        }

        if (cardWalletPaymentMethods != null && cardWalletPaymentMethods.length > 0) {
            params.append(
                "cardWalletPaymentMethods",
                typeof cardWalletPaymentMethods === "string"
                    ? cardWalletPaymentMethods
                    : JSON.stringify(cardWalletPaymentMethods)
            );
        }

        if (props.emailInputOptions != null) {
            params.append("emailInputOptions", JSON.stringify(props.emailInputOptions));
        }

        if (projectId != null) {
            params.append("projectId", projectId);
        }

        return `${baseUrl}/sdk/paymentElement?${params.toString()}`;
    }

    function listenToEvents(
        cb: <K extends keyof CheckoutEventMap>(event: MessageEvent<CrossmintCheckoutEvent<K>>) => void
    ): () => void {
        function _internalOnEvent(event: MessageEvent<any>) {
            if (event.origin !== baseUrl) {
                return;
            }

            if (Object.values(CheckoutEvents).includes(event.data.type)) {
                cb(event);
            }
        }

        window.addEventListener("message", _internalOnEvent);

        return () => {
            window.removeEventListener("message", _internalOnEvent);
        };
    }

    function emitQueryParams(payload: ParamsUpdatePayload) {
        const iframe = document.getElementById("iframe-crossmint-payment-element") as HTMLIFrameElement;
        iframe?.contentWindow?.postMessage({ type: PaymentElementSDKEvents.PARAMS_UPDATE, payload }, baseUrl);
    }

    return {
        getIframeUrl,
        listenToEvents,
        emitQueryParams,
    };
}
