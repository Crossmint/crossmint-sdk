import type { Locale } from "@/types";
import type { EmbeddedCheckoutV3LineItem, EmbeddedCheckoutV3Payment, EmbeddedCheckoutV3Recipient } from "@/types/embed";

export interface CrossmintHostedCheckoutV3Props {
    receipient?: EmbeddedCheckoutV3Recipient;
    locale?: Locale;
    webhookPassthroughData?: any;
    lineItems: EmbeddedCheckoutV3LineItem | EmbeddedCheckoutV3LineItem[];
    payment: EmbeddedCheckoutV3Payment;
    appearance?: CrossmintHostedCheckoutV3Appearance;
}

export interface CrossmintHostedCheckoutV3Appearance {
    theme?: {
        checkout?: CrossmintHostedCheckoutV3Theme;
        button?: CrossmintHostedCheckoutV3ButtonTheme;
    };
    variables?: CrossmintHostedCheckoutV3AppearanceVariables;
    overlay?: CrossmintHostedCheckoutV3OverlayOptions;
    display?: "popup" | "same-tab" | "new-tab";
}

export type CrossmintHostedCheckoutV3Theme = "light" | "dark";
export type CrossmintHostedCheckoutV3ButtonTheme = "light" | "dark" | "crossmint";

export interface CrossmintHostedCheckoutV3AppearanceVariables {
    colors?: {
        accent?: string;
    };
}

export type CrossmintHostedCheckoutV3OverlayOptions = { enabled: boolean };
