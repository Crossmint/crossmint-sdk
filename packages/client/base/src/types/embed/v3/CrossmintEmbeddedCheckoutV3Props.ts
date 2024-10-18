import type { Currency as FiatCurrency, Locale } from "@/types";

import type { BlockchainIncludingTestnet } from "@crossmint/common-sdk-base";

export interface CrossmintEmbeddedCheckoutV3Props {
    recipient?: EmbeddedCheckoutV3Recipient;
    locale?: Locale;
    webhookPassthroughData?: any;
    appearance?: EmbeddedCheckoutV3Appearance;
    lineItems: EmbeddedCheckoutV3LineItem | EmbeddedCheckoutV3LineItem[];
    payment: EmbeddedCheckoutV3Payment;
}

export type EmbeddedCheckoutV3Recipient = { email: string } | { walletAddress: string };

export type EmbeddedCheckoutV3LineItem = {
    collectionLocator: string;
    callData?: Record<string, any>;
};

export type EmbeddedCheckoutV3Appearance = {
    fonts?: Array<{ cssSrc: string }>;
    variables?: EmbeddedCheckoutV3AppearanceVariables;
    rules?: EmbeddedCheckoutV3AppearanceRules;
};

export type EmbeddedCheckoutV3AppearanceVariables = {
    fontFamily?: string;
    spacingUnit?: string;
    fontSizeUnit?: string;
    borderRadius?: string;
    colors?: {
        borderPrimary?: string;
        backgroundPrimary?: string;
        textPrimary?: string;
        textSecondary?: string;
        danger?: string;
        accent?: string;
    };
};

export type EmbeddedCheckoutV3AppearanceRules = {
    Label?: {
        font?: {
            family?: string;
            size?: string;
            weight?: string;
        };
        colors?: {
            text?: string;
        };
    };
    Input?: {
        borderRadius?: string;
        font?: {
            family?: string;
            size?: string;
            weight?: string;
        };
        colors?: {
            text?: string;
            background?: string;
            border?: string;
            boxShadow?: string;
            placeholder?: string;
        };
        hover?: {
            colors?: {
                text?: string;
                background?: string;
                border?: string;
                boxShadow?: string;
            };
        };
        focus?: {
            colors?: {
                background?: string;
                border?: string;
                boxShadow?: string;
            };
        };
    };
};

export type EmbeddedCheckoutV3Payment = {
    fiat: EmbeddedCheckoutV3FiatPayment;
    crypto: EmbeddedCheckoutV3CryptoPayment;
    defaultMethod?: "fiat" | "crypto";
};

export type EmbeddedCheckoutV3FiatPayment = {
    enabled: boolean;
    defaultCurrency?: FiatCurrency;
    allowedMethods?: {
        card?: boolean;
        applePay?: boolean;
        googlePay?: boolean;
    };
};

export type EmbeddedCheckoutV3CryptoPayment = {
    enabled: boolean;
    defaultChain?: BlockchainIncludingTestnet;
    defaultCurrency?: string; // TODO: Make CryptoCurrency type
    allowedCurrencies?: Partial<Record<BlockchainIncludingTestnet, false | string[]>>; // TODO: Replace string[] with CryptoCurrency[]
    payer?: any; // TODO: Ethers, Viem, Solana
};
