import {
    CaseInsensitive,
    CollectionOrClientId,
    CrossmintPublicEventUnion,
    Currency,
    Locale,
    MintConfigs,
    PaymentMethod,
    UIConfig,
} from "..";
import { CryptoEmbeddedCheckoutProps } from "./crypto";
import { FiatEmbeddedCheckoutProps } from "./fiat";

export * from "./crypto";
export * from "./fiat";

export type CommonEmbeddedCheckoutProps<PM extends PaymentMethod = PaymentMethod> = {
    paymentMethod?: PM;
    mintConfig?: MintConfigs;
    currency?: CaseInsensitive<Currency>;
    locale?: Locale;
    environment?: string;
    uiConfig?: UIConfig;
    whPassThroughArgs?: any;
    projectId?: string;
    onEvent?(event: CrossmintPublicEventUnion): any;
} & CollectionOrClientId;

export type CrossmintEmbeddedCheckoutProps = FiatEmbeddedCheckoutProps | CryptoEmbeddedCheckoutProps;
