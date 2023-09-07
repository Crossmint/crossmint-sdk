import {
    CaseInsensitive,
    CollectionOrClientId,
    CryptoPaymentMethod,
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
} & CollectionOrClientId;

export type CrossmintEmbeddedCheckoutProps =
    | FiatEmbeddedCheckoutProps
    | { [K in CryptoPaymentMethod]: CryptoEmbeddedCheckoutProps<K> }[CryptoPaymentMethod];
