import { LitElement, html } from "lit";
import { property } from "lit/decorators.js";
import { customElement } from "lit/decorators/custom-element.js";

import { crossmintPaymentService_OLD, crossmintUiService_OLD } from "@crossmint/client-sdk-base";
import type {
    CrossmintEvent,
    FiatEmbeddedCheckoutProps,
    Locale,
    MintConfig,
    Recipient,
} from "@crossmint/client-sdk-base";
import type { UIConfig } from "@crossmint/common-sdk-base";

const propertyDefaults: FiatEmbeddedCheckoutProps = {
    collectionId: "",
    projectId: "",
    mintConfig: {},
    recipient: {
        email: "",
        wallet: "",
    },
    paymentMethod: "fiat",
    currency: "usd",
    locale: "en-US",
    uiConfig: {},
    environment: "production",
    whPassThroughArgs: undefined,
    onEvent: undefined,
    experimental: undefined,
};

@customElement("crossmint-payment-element")
export class CrossmintPaymentElement extends LitElement {
    @property({ type: String })
    clientId = "";

    @property({ type: String })
    collectionId = "";

    @property({ type: String })
    projectId: FiatEmbeddedCheckoutProps["projectId"] = propertyDefaults.projectId;

    @property({ type: Object })
    mintConfig?: MintConfig = propertyDefaults.mintConfig;

    @property({ type: Object })
    recipient?: Recipient = propertyDefaults.recipient;

    @property({ type: String })
    paymentMethod?: "fiat" = propertyDefaults.paymentMethod;

    @property({ type: String })
    currency?: FiatEmbeddedCheckoutProps["currency"] = propertyDefaults.currency;

    @property({ type: String })
    locale?: Locale = propertyDefaults.locale;

    @property({ type: Object })
    uiConfig?: UIConfig = propertyDefaults.uiConfig;

    @property({ type: String })
    environment?: string = propertyDefaults.environment;

    @property({ type: Object })
    whPassThroughArgs?: string = propertyDefaults.whPassThroughArgs;

    @property({ type: Array || String })
    cardWalletPaymentMethods?: FiatEmbeddedCheckoutProps["cardWalletPaymentMethods"] =
        propertyDefaults.cardWalletPaymentMethods;

    @property({ type: Object })
    emailInputOptions?: FiatEmbeddedCheckoutProps["emailInputOptions"] = propertyDefaults.emailInputOptions;

    @property({ type: Function || String })
    onEvent?: (event: CrossmintEvent) => void = propertyDefaults.onEvent;

    @property({ type: Object })
    experimental?: FiatEmbeddedCheckoutProps["experimental"] = propertyDefaults.experimental;

    height = 0;
    removeEventListener = () => {};
    removeUIEventListener = () => {};

    connectedCallback() {
        super.connectedCallback();

        const onEvent = getOnEventFunction(this.onEvent);

        const { listenToEvents } = crossmintPaymentService_OLD(getPaymentServiceProps(this));
        const { listenToEvents: listenToUiEvents } = crossmintUiService_OLD({ environment: this.environment });

        this.removeEventListener = listenToEvents((event) => onEvent?.(event.data));

        this.removeUIEventListener = listenToUiEvents((event: MessageEvent<any>) => {
            const { type, payload } = event.data;

            switch (type) {
                case "ui:height.changed":
                    this.height = payload.height;
                    this.requestUpdate();
                    break;
                default:
                    return;
            }
        });
    }

    disconnectedCallback() {
        super.disconnectedCallback();

        this.removeEventListener();
        this.removeUIEventListener();
    }

    updated(changedProperties: Map<string, unknown>) {
        super.updated(changedProperties);
        const { emitQueryParams } = crossmintPaymentService_OLD(getPaymentServiceProps(this));

        if (
            changedProperties.has("recipient") ||
            changedProperties.has("mintConfig") ||
            changedProperties.has("locale") ||
            changedProperties.has("currency") ||
            changedProperties.has("whPassThroughArgs")
        ) {
            emitQueryParams({
                recipient: this.recipient,
                mintConfig: this.mintConfig,
                locale: this.locale,
                currency: this.currency,
                whPassThroughArgs: this.whPassThroughArgs,
            });
        }
    }

    render() {
        const { getIframeUrl } = crossmintPaymentService_OLD(getPaymentServiceProps(this));

        return html`
            <iframe
                src=${getIframeUrl()}
                allow="payment *"
                id="crossmint-embedded-checkout.iframe"
                style="border: none !important;
                padding: 0px !important;
                width: 100% !important;
                min-width: 100% !important;
                overflow: hidden !important;
                display: block !important;
                user-select: none !important;
                transform: translate(0px) !important;
                opacity: 1;
                transition: ease 0s, opacity 0.4s ease 0.1s;
                height: ${this.height}px;"
            ></iframe>
        `;
    }
}

function getOnEventFunction(onEvent?: any) {
    if (!onEvent) {
        return undefined;
    }
    return typeof onEvent === "string" ? new Function(onEvent)() : onEvent;
}

function getPaymentServiceProps(_this: CrossmintPaymentElement): FiatEmbeddedCheckoutProps {
    let collectionOrClientId: { collectionId: string } | { clientId: string } | undefined = undefined;
    if (_this.clientId) {
        collectionOrClientId = { clientId: _this.clientId };
    } else if (_this.collectionId) {
        collectionOrClientId = { collectionId: _this.collectionId };
    }

    if (!collectionOrClientId) {
        throw new Error("clientId or collectionId must be provided");
    }

    return {
        projectId: _this.projectId,
        environment: _this.environment,
        uiConfig: _this.uiConfig,
        recipient: _this.recipient,
        mintConfig: _this.mintConfig,
        whPassThroughArgs: _this.whPassThroughArgs,
        cardWalletPaymentMethods: _this.cardWalletPaymentMethods,
        emailInputOptions: _this.emailInputOptions,
        currency: _this.currency,
        locale: _this.locale,
        paymentMethod: _this.paymentMethod,
        experimental: _this.experimental,
        onEvent: _this.onEvent,
        ...collectionOrClientId,
    };
}
