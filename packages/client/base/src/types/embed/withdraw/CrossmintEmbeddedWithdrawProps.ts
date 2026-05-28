import type { Locale } from "@/types";

import type { EmbeddedCheckoutV3Appearance } from "../v3/CrossmintEmbeddedCheckoutV3Props";

interface CrossmintEmbeddedWithdrawCommonProps {
    appearance?: EmbeddedCheckoutV3Appearance;
    payment: EmbeddedWithdrawPayment;
}

export interface CrossmintEmbeddedWithdrawJwtProps extends CrossmintEmbeddedWithdrawCommonProps {
    jwt: string;
    orderId?: never;
    clientSecret?: never;
    locale?: Locale;
}

export interface CrossmintEmbeddedWithdrawOrderProps extends CrossmintEmbeddedWithdrawCommonProps {
    orderId: string;
    clientSecret: string;
    jwt?: never;
    locale?: never;
}

export type CrossmintEmbeddedWithdrawProps = CrossmintEmbeddedWithdrawJwtProps | CrossmintEmbeddedWithdrawOrderProps;

export type EmbeddedWithdrawPayment = {
    method: string;
    currency: string;
    payerAddress: string;
    receiptEmail?: string;
};

export type EmbeddedWithdrawAmount = {
    value: string;
    token: string;
    fiatCurrency: string;
};
