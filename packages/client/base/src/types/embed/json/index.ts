import type { UIConfig } from "@crossmint/common-sdk-base";

import type {
    CaseInsensitive,
    CollectionOrClientId,
    Currency,
    Locale,
    MintConfigs,
    PaymentMethod,
    Recipient,
} from "../..";
import type { CryptoEmbeddedCheckoutPropsJSONParsed, CryptoEmbeddedCheckoutPropsJSONStringified } from "./crypto";
import type { FiatEmbeddedCheckoutPropsJSONParsed, FiatEmbeddedCheckoutPropsJSONStringified } from "./fiat";

export type CommonEmbeddedCheckoutPropsJSONStringified<PM extends PaymentMethod = PaymentMethod> = {
    paymentMethod?: PM;
    mintConfig?: string;
    currency?: CaseInsensitive<Currency>;
    locale?: Locale;
    uiConfig?: string;
    whPassThroughArgs?: string;
    projectId?: string;
    recipient?: string;
} & CollectionOrClientId;

export type CommonEmbeddedCheckoutPropsJSONParsed<PM extends PaymentMethod = PaymentMethod> = {
    paymentMethod?: PM;
    mintConfig?: MintConfigs;
    currency?: CaseInsensitive<Currency>;
    locale?: Locale;
    uiConfig?: UIConfig;
    whPassThroughArgs?: any;
    projectId?: string;
    recipient?: Recipient;
} & CollectionOrClientId;

export type CrossmintEmbeddedCheckoutPropsJSONStringified =
    | FiatEmbeddedCheckoutPropsJSONStringified
    | CryptoEmbeddedCheckoutPropsJSONStringified;
export type CrossmintEmbeddedCheckoutPropsJSONParsed =
    | FiatEmbeddedCheckoutPropsJSONParsed
    | CryptoEmbeddedCheckoutPropsJSONParsed;
