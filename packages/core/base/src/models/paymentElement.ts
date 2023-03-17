import { CheckoutEvents } from "./events";
import { Currency, Locale, PaymentMethod, UIConfig } from "./types";

export type Recipient =
    | {
          email: string;
          mintTo?: string;
      }
    | {
          mintTo: string;
      };

export interface PaymentElement {
    clientId: string;
    mintArgs: Record<string, any>;
    recipient?: Recipient;
    paymentMethod: PaymentMethod;
    currency: Currency;
    locale: Locale;
    uiConfig: UIConfig;
    onEvent: (event: CheckoutEvents, metadata: Record<string, any>) => void;
}
