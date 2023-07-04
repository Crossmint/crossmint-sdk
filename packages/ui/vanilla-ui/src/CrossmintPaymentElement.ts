import { LitElement, html } from "lit";
import { property } from "lit/decorators.js";
import { crossmintPaymentService, crossmintUiService } from "@crossmint/client-sdk-base";
import { customElement } from "lit/decorators/custom-element.js";

import type {
  Locale,
  MintConfig,
  PaymentMethod,
  Recipient,
  UIConfig,
  PaymentElement
} from "@crossmint/client-sdk-base";

const propertyDefaults: PaymentElement = {
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
  };

@customElement("crossmint-payment-element")
export class CrossmintPaymentElement extends LitElement {
  @property({ type: String })
  clientId = "";

  @property({ type: String })
  collectionId = "";

  @property({ type: String })
  projectId: PaymentElement["projectId"] = propertyDefaults.projectId;

  @property({ type: Object })
  mintConfig?: MintConfig = propertyDefaults.mintConfig;

  @property({ type: Object })
  recipient?: Recipient = propertyDefaults.recipient;

  @property({ type: String })
  paymentMethod?: PaymentMethod = propertyDefaults.paymentMethod;

  @property({ type: String })
  currency?: PaymentElement["currency"] = propertyDefaults.currency;

  @property({ type: String })
  locale?: Locale = propertyDefaults.locale;

  @property({ type: Object })
  uiConfig?: UIConfig = propertyDefaults.uiConfig;

  @property({ type: String })
  environment?: string = propertyDefaults.environment;

  @property({ type: Object })
  whPassThroughArgs?: string = propertyDefaults.whPassThroughArgs;

  @property({ type: Function || String })
  onEvent?: (event: any) => void = propertyDefaults.onEvent;

  height = 0;
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  removeEventListener = () => {};
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  removeUIEventListener = () => {};


  connectedCallback() {
    super.connectedCallback();

    const onEvent = getOnEventFunction(this.onEvent);

    const { listenToEvents } = crossmintPaymentService({ 
      clientId: this.clientId || this.collectionId,
      projectId: this.projectId,
      environment: this.environment,
      uiConfig: this.uiConfig,
      recipient: this.recipient,
      mintConfig: this.mintConfig,
      whPassThroughArgs: this.whPassThroughArgs
    });
    const { listenToEvents: listenToUiEvents } = crossmintUiService({ environment: this.environment });

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
    const { emitQueryParams } = crossmintPaymentService({ 
      clientId: this.clientId || this.collectionId,
      projectId: this.projectId,
      environment: this.environment,
      uiConfig: this.uiConfig,
      recipient: this.recipient,
      mintConfig: this.mintConfig
    });

    if (
      changedProperties.has("recipient") ||
      changedProperties.has("mintConfig") ||
      changedProperties.has("locale") ||
      changedProperties.has("whPassThroughArgs")
    ) {
      emitQueryParams({ recipient: this.recipient, mintConfig: this.mintConfig, locale: this.locale, whPassThroughArgs: this.whPassThroughArgs });
    }
  }

  render() {
    const {getIframeUrl} = crossmintPaymentService({ 
      clientId: this.clientId || this.collectionId,
      projectId: this.projectId,
      environment: this.environment,
      uiConfig: this.uiConfig,
      recipient: this.recipient,
      mintConfig: this.mintConfig 
    });

    return html`
      <iframe
        src=${getIframeUrl()}
        allow="payment *"
        id="iframe-crossmint-payment-element"
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
  if (!onEvent){
    return undefined;
  }
  return typeof onEvent === "string" ? new Function(onEvent)() : onEvent;
}
