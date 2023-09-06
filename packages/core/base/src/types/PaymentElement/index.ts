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
import { CryptoPaymentElementProps } from "./crypto";
import { FiatPaymentElementProps } from "./fiat";

export * from "./crypto";
export * from "./fiat";

export type CommonPaymentElementProps<PM extends PaymentMethod = PaymentMethod> = {
    paymentMethod?: PM;
    mintConfig?: MintConfigs;
    currency?: CaseInsensitive<Currency>;
    locale?: Locale;
    environment?: string;
    uiConfig?: UIConfig;
    whPassThroughArgs?: any;
    projectId?: string;
} & CollectionOrClientId;

export type PaymentElementProps =
    | FiatPaymentElementProps
    | { [K in CryptoPaymentMethod]: CryptoPaymentElementProps<K> }[CryptoPaymentMethod];
