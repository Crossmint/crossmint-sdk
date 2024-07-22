import { Currency as FiatCurrency, Locale } from "@/types";

import { Blockchain } from "@crossmint/common-sdk-base";

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

export type EmbeddedCheckoutV3Appearance = {};

export type EmbeddedCheckoutV3Payment = {
    fiat?: EmbeddedCheckoutV3FiatPayment;
    crypto?: EmbeddedCheckoutV3CryptoPayment;
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
    defaultChain?: Blockchain;
    defaultCurrency?: string; // TODO: Make CryptoCurrency type
    allowedCurrencies?: Partial<Record<Blockchain, false | string[]>>; // TODO: Replace string[] with CryptoCurrency[]
    payer?: any; // TODO: Ethers, Viem, Solana
};
