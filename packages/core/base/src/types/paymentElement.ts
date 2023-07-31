import { Currency, Locale, PaymentMethod, Recipient } from ".";
import { CrossmintCheckoutEventUnion } from "./events";
import { CollectionId, MintConfigs } from "./payButton";
import { CaseInsensitive } from "./system";
import { UIConfig } from "./uiconfig";

export type PaymentElementExperimentalOptions = {
    useCardWalletEmail?: boolean; // Allows the recipient's email to be obtained from the card wallet. Currently only supported when `recipient.wallet` is also passed. If an email is already specified in `recipient.email` or typed by the user, it will take precedence over the email obtained from the card wallet.
};

// TODO: Remmeber to update this same interface in the Vue component aswell.
// packages/ui/vue-ui/src/components/CrossmintPaymentElement.vue
export type PaymentElement = {
    projectId?: string;
    mintConfig?: MintConfigs;
    recipient?: Recipient;
    paymentMethod?: PaymentMethod;
    currency?: CaseInsensitive<Currency>;
    locale?: Locale;
    uiConfig?: UIConfig;
    environment?: string;
    whPassThroughArgs?: any;
    onEvent?(event: CrossmintCheckoutEventUnion): any;
    cardWalletPaymentMethods?: CardWalletPaymentMethod | CardWalletPaymentMethod[] | "none";
    emailInputOptions?: EmailInputOptions;
    experimental?: PaymentElementExperimentalOptions;
} & CollectionId;

export type EmailInputOptions =
    | {
          show: true;
          useStripeLink?: boolean;
      }
    | {
          show: false;
      };

export type CardWalletPaymentMethod = "apple-pay" | "google-pay";
