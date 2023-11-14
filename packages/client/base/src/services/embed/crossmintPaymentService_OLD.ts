import {
    CrossmintEvent,
    CrossmintEvents,
    CrossmintInternalEvents,
    FiatEmbeddedCheckoutProps,
    UpdatableEmbeddedCheckoutParams,
} from "../../types";
import { getEnvironmentBaseUrl } from "../../utils";

// TODO: Accept both fiat and crypto
export function crossmintPaymentService_OLD(props: FiatEmbeddedCheckoutProps) {
    const clientId = "clientId" in props ? props.clientId : props.collectionId;
    const {
        uiConfig,
        recipient,
        environment,
        mintConfig,
        locale,
        currency,
        whPassThroughArgs,
        cardWalletPaymentMethods,
        projectId,
        emailInputOptions,
        experimental,
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

        if (currency != null) {
            params.append("currency", currency);
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

        if (emailInputOptions != null) {
            params.append("emailInputOptions", JSON.stringify(emailInputOptions));
        }

        if (projectId != null) {
            params.append("projectId", projectId);
        }

        if (experimental != null) {
            params.append("experimental", JSON.stringify(experimental));
        }

        return `${baseUrl}/sdk/paymentElement?${params.toString()}`;
    }

    function listenToEvents(cb: (event: MessageEvent<CrossmintEvent>) => void): () => void {
        function _internalOnEvent(event: MessageEvent<any>) {
            if (event.origin !== baseUrl) {
                return;
            }

            if (Object.values(CrossmintEvents).includes(event.data.type)) {
                cb(event);
            }
        }

        window.addEventListener("message", _internalOnEvent);

        return () => {
            window.removeEventListener("message", _internalOnEvent);
        };
    }

    function emitQueryParams(payload: UpdatableEmbeddedCheckoutParams) {
        const iframe = document.getElementById("crossmint-embedded-checkout.iframe") as HTMLIFrameElement | null;
        if (iframe == null) {
            console.error("[Crossmint] Failed to find crossmint-embedded-checkout.iframe");
        }
        try {
            iframe?.contentWindow?.postMessage({ type: CrossmintInternalEvents.PARAMS_UPDATE, payload }, baseUrl);
        } catch (e) {
            console.log("[Crossmint] Failed to emit query params", e);
        }
    }

    return {
        getIframeUrl,
        listenToEvents,
        emitQueryParams,
    };
}
