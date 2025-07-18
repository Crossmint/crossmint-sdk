import type { Locale, Currency as FiatCurrency, CryptoCurrency } from "@/types";
import type { EmbeddedCheckoutV3LineItem, EmbeddedCheckoutV3Recipient } from "@/types/embed";
import type { BlockchainIncludingTestnet, JSONObject } from "@crossmint/common-sdk-base";

export interface CrossmintHostedCheckoutV3Props {
    recipient?: EmbeddedCheckoutV3Recipient;
    locale?: Locale;
    lineItems: EmbeddedCheckoutV3LineItem | EmbeddedCheckoutV3LineItem[];
    payment: HostedCheckoutV3Payment;
    appearance?: CrossmintHostedCheckoutV3Appearance;
    metadata?: JSONObject;
}

export type HostedCheckoutV3Payment = {
    receiptEmail?: string;
    fiat: HostedCheckoutV3FiatPayment;
    crypto: HostedCheckoutV3CryptoPayment;
    defaultMethod?: "fiat" | "crypto";
};

export type HostedCheckoutV3FiatPayment = {
    enabled: boolean;
    defaultCurrency?: FiatCurrency;
};

export type HostedCheckoutV3CryptoPayment = {
    enabled: boolean;
    defaultChain?: BlockchainIncludingTestnet;
    defaultCurrency?: CryptoCurrency;
};

export interface CrossmintHostedCheckoutV3Appearance {
    theme?: {
        checkout?: CrossmintHostedCheckoutV3Theme;
        button?: CrossmintHostedCheckoutV3ButtonTheme;
    };
    variables?: CrossmintHostedCheckoutV3AppearanceVariables;
    overlay?: CrossmintHostedCheckoutV3OverlayOptions;
    display?: "popup" | "new-tab" | "same-tab";
    rules?: HostedCheckoutV3AppearanceRules;
}

// This type is different that the one in Embedded.
// Read: https://crossmint.slack.com/archives/C064HDR6VP1/p1746450589948919
export type HostedCheckoutV3AppearanceRules = {
    DestinationInput?: {
        display?: "hidden";
    };
    ReceiptEmailInput?: {
        display?: "hidden";
    };
};

export type CrossmintHostedCheckoutV3Theme = "light" | "dark";
export type CrossmintHostedCheckoutV3ButtonTheme = "light" | "dark" | "crossmint";

export interface CrossmintHostedCheckoutV3AppearanceVariables {
    colors?: {
        accent?: string;
    };
}

export type CrossmintHostedCheckoutV3OverlayOptions = { enabled: boolean };
