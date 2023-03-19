import { CheckoutEventMap } from "./events";
import { Currency, Locale, PaymentMethod } from "./types";

// TODO: Remmeber to update this same interface in the Vue component aswell.
// packages/ui/vue-ui/src/components/CrossmintPaymentElement.vue
export interface PaymentElement {
    clientId: string;
    mintArgs?: Record<string, any>;
    recipient?: string;
    paymentMethod?: PaymentMethod;
    currency?: Currency;
    locale?: Locale;
    onEvent?<K extends keyof CheckoutEventMap>(event: K, payload: CheckoutEventMap[K]): this;
}
