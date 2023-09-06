import { CommonEmbeddedCheckoutProps } from ".";
import { Recipient } from "..";
import { CrossmintCheckoutEventUnion } from "../events";

export type FiatEmbeddedCheckoutProps = CommonEmbeddedCheckoutProps<"fiat"> & {
    // TODO: Audit old params
    cardWalletPaymentMethods?: CardWalletPaymentMethod | CardWalletPaymentMethod[] | "none";
    emailInputOptions?: EmailInputOptions;
    experimental?: EmbeddedCheckoutExperimentalOptions;
    onEvent?(event: CrossmintCheckoutEventUnion): any;
    recipient?: Recipient;
};

export type CardWalletPaymentMethod = "apple-pay" | "google-pay";
export type EmailInputOptions =
    | {
          show: true;
          useStripeLink?: boolean;
      }
    | {
          show: false;
      };

export type EmbeddedCheckoutExperimentalOptions = {
    useCardWalletEmail?: boolean; // Allows the recipient's email to be obtained from the card wallet. Currently only supported when `recipient.wallet` is also passed. If an email is already specified in `recipient.email` or typed by the user, it will take precedence over the email obtained from the card wallet.
};
