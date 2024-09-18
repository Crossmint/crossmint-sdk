import type { CommonEmbeddedCheckoutPropsJSONParsed, CommonEmbeddedCheckoutPropsJSONStringified } from ".";
import type { CardWalletPaymentMethod, EmailInputOptions, EmbeddedCheckoutExperimentalOptions } from "../fiat";

export type FiatEmbeddedCheckoutPropsJSONStringified = CommonEmbeddedCheckoutPropsJSONStringified<"fiat"> & {
    cardWalletPaymentMethods?: string;
    emailInputOptions?: string;
    experimental?: string;
};

export type FiatEmbeddedCheckoutPropsJSONParsed = CommonEmbeddedCheckoutPropsJSONParsed<"fiat"> & {
    cardWalletPaymentMethods?: CardWalletPaymentMethod | CardWalletPaymentMethod[] | "none";
    emailInputOptions?: EmailInputOptions;
    experimental?: EmbeddedCheckoutExperimentalOptions;
};
