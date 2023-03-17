import { Currency, Locale, PaymentMethod } from "./types";

export interface PaymentElement {
    clientId: string;
    mintArgs: Record<string, any>;
    recipient?: string;
    paymentMethod: PaymentMethod;
    currency: Currency;
    locale: Locale;
    // TODO: Use checkout event type when it's ready;
    onEvent: (event: string, metadata: Record<string, any>) => void;
}
