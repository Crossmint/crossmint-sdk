import type { UIConfig } from "@crossmint/common-sdk-base";

import type {
    CaseInsensitive,
    CollectionOrClientId,
    CrossmintEvent,
    Currency,
    Locale,
    MintConfigs,
    PaymentMethod,
    Recipient,
} from "..";
import type { CryptoEmbeddedCheckoutProps } from "./crypto";
import type { FiatEmbeddedCheckoutProps } from "./fiat";

export * from "./crypto";
export * from "./fiat";
export * from "./json";
export * from "./updatable";

export * from "./v3";

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
    debug?: boolean;
} & CollectionOrClientId;

export type CrossmintEmbeddedCheckoutProps = FiatEmbeddedCheckoutProps | CryptoEmbeddedCheckoutProps;
