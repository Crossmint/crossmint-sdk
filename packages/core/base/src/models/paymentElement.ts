import { CheckoutEventMap } from "./events";
import { Currency, Locale, PaymentMethod, UIConfig } from "./types";

export type Recipient =
    | {
          email: string;
          mintTo?: string;
      }
    | {
          mintTo: string;
      };

// TODO: Remmeber to update this same interface in the Vue component aswell.
// packages/ui/vue-ui/src/components/CrossmintPaymentElement.vue
export interface PaymentElement {
    clientId: string;
    mintArgs?: Record<string, any>;
    recipient?: Recipient;
    paymentMethod?: PaymentMethod;
    currency?: Currency;
    locale?: Locale;
    uiConfig?: UIConfig;
    onEvent?<K extends keyof CheckoutEventMap>(event: K, payload: CheckoutEventMap[K]): this;
}
