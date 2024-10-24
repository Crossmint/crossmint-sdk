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
    theme?: "light" | "dark";
    variables?: CrossmintHostedCheckoutV3AppearanceVariables;
    overlay?: CrossmintHostedCheckoutV3OverlayOptions;
    display?: "popup" | "same-tab" | "new-tab";
}

export interface CrossmintHostedCheckoutV3AppearanceVariables {
    colors?: {
        accent?: string;
    };
}

export type CrossmintHostedCheckoutV3OverlayOptions = { enabled: boolean };
