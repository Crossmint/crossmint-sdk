export * from "./errors";
export * from "./events";
export * from "./hosted";
export * from "./embed";
export * from "./system";

export enum clientNames {
    reactUi = "client-sdk-react-ui",
    vanillaUi = "client-sdk-vanilla-ui",
}

export const BaseUrls = {
    prod: "https://www.crossmint.com",
    staging: "https://staging.crossmint.com",
    dev: "http://localhost:3001",
} as const;
export type BaseUrls = (typeof BaseUrls)[keyof typeof BaseUrls];

export const CryptoPaymentMethod = {
    ETH: "ETH",
    SOL: "SOL",
} as const;
export type CryptoPaymentMethod = (typeof CryptoPaymentMethod)[keyof typeof CryptoPaymentMethod];

export const PaymentMethod = {
    FIAT: "fiat",
    ...CryptoPaymentMethod,
} as const;
export type PaymentMethod = (typeof PaymentMethod)[keyof typeof PaymentMethod];

export const paymentMethodIsEth = (paymentMethod?: PaymentMethod) => paymentMethod === "ETH";
export const paymentMethodIsSol = (paymentMethod?: PaymentMethod) => paymentMethod === "SOL";

export type Locale =
    | "en-US"
    | "es-ES"
    | "fr-FR"
    | "it-IT"
    | "ja-JP"
    | "ko-KR"
    | "pt-PT"
    | "zh-CN"
    | "zh-TW"
    | "de-DE"
    | "ru-RU"
    | "tr-TR"
    | "uk-UA"
    | "th-TH"
    | "vi-VN"
    | "Klingon";

export type Currency = "usd" | "eur" | "gbp" | "aud" | "sgd" | "hkd" | "krw" | "inr" | "vnd" | "jpy";

export interface FiatPrice {
    amount: string;
    currency: Currency;
}

export type Recipient = {
    email?: string;
    wallet?: string;
};
