import { LitElement, html } from "lit";
import { property } from "lit/decorators.js";
import { crossmintPaymentService } from "@crossmint/client-sdk-base";
import { customElement } from "lit/decorators/custom-element.js";

import type {
  Currency,
  Locale,
  MintConfig,
  PaymentMethod,
  Recipient,
  UIConfig,
  PaymentElement
} from "@crossmint/client-sdk-base";

const propertyDefaults: PaymentElement = {
    clientId: "",
    mintConfig: {},
    recipient: {
      email: "",
      wallet: "",
    },
    paymentMethod: "fiat",
    currency: "USD",
    locale: "en-US",
    uiConfig: {},
    environment: "production",
    onEvent: undefined,
  };

@customElement("crossmint-payment-element")
export class CrossmintPaymentElement extends LitElement {
  @property({ type: String })
  clientId: string = propertyDefaults.clientId;

  @property({ type: Object })
  mintConfig?: MintConfig = propertyDefaults.mintConfig;

  @property({ type: Object })
  recipient?: Recipient = propertyDefaults.recipient;

  @property({ type: String })
  paymentMethod?: PaymentMethod = propertyDefaults.paymentMethod;

  @property({ type: String })
  currency?: Currency = propertyDefaults.currency;

  @property({ type: String })
  locale?: Locale = propertyDefaults.locale;

  @property({ type: Object })
  uiConfig?: UIConfig = propertyDefaults.uiConfig;

  @property({ type: String })
  environment?: string = propertyDefaults.environment;

  @property({ type: Function || String })
  onEvent?: (event: any) => void = propertyDefaults.onEvent;

  connectedCallback() {
    super.connectedCallback();

    const onEvent = getOnEventFunction(this.onEvent);

    const { listenToEvents } = crossmintPaymentService({ clientId: this.clientId, environment: this.environment, uiConfig: this.uiConfig, recipient: this.recipient, mintConfig: this.mintConfig });

    listenToEvents((event) => onEvent?.(event.data));
  }

  updated(changedProperties: Map<string, unknown>) {
    super.updated(changedProperties);
    const { emitQueryParams } = crossmintPaymentService({ clientId: this.clientId, environment: this.environment, uiConfig: this.uiConfig, recipient: this.recipient, mintConfig: this.mintConfig });

    if (
      changedProperties.has("recipient") ||
      changedProperties.has("mintConfig") ||
      changedProperties.has("locale")
    ) {
      emitQueryParams({ recipient: this.recipient, mintConfig: this.mintConfig, locale: this.locale });
    }
  }

  render() {
    const {getIframeUrl} = crossmintPaymentService({ clientId: this.clientId, environment: this.environment, uiConfig: this.uiConfig, recipient: this.recipient, mintConfig: this.mintConfig });

    return html`
      <iframe
        src=${getIframeUrl()}
        id="iframe-crossmint-payment-element"
        style="width: 100%; height: 100%; border: none; margin: 0; padding: 0; height: 96px;"
      ></iframe>
    `;
  }
}

function getOnEventFunction(onEvent?: any) {
  if (!onEvent){
    return undefined;
  }
  return typeof onEvent === "string" ? new Function(onEvent)() : onEvent;
}
