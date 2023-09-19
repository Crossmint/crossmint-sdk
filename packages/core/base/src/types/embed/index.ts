import {
    CaseInsensitive,
    CollectionOrClientId,
    CrossmintEvent,
    Currency,
    Locale,
    MintConfigs,
    PaymentMethod,
    Recipient,
    UIConfig,
} from "..";
import { CryptoEmbeddedCheckoutProps } from "./crypto";
import { FiatEmbeddedCheckoutProps } from "./fiat";

export * from "./crypto";
export * from "./fiat";
export * from "./json";
export * from "./updatable";

export type CommonEmbeddedCheckoutProps<PM extends PaymentMethod = PaymentMethod> = {
    paymentMethod?: PM;
    mintConfig?: MintConfigs;
    currency?: CaseInsensitive<Currency>;
    locale?: Locale;
    environment?: string;
    uiConfig?: UIConfig;
    whPassThroughArgs?: any;
    projectId?: string;
    recipient?: Recipient;
    onEvent?(event: CrossmintEvent): any;
} & CollectionOrClientId;

export type CrossmintEmbeddedCheckoutProps = FiatEmbeddedCheckoutProps | CryptoEmbeddedCheckoutProps;
