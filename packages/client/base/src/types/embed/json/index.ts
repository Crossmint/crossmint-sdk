import type { UIConfig } from "@crossmint/common-sdk-base";

import type { CaseInsensitive, CollectionOrClientId, MintConfigs } from "../..";
import type { Recipient } from "@/types/Recipient";
import type { Currency } from "@/types/Currency";
import type { Locale } from "@/types/Locale";
import type { PaymentMethod } from "@/types/PaymentMethod";
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
