export * from "./blockchain";
export * from "./errors";
export * from "./events";
export * from "./payButton";
export * from "./paymentElement";
export * from "./system";
export * from "./uiconfig";

export enum clientNames {
    reactUi = "client-sdk-react-ui",
    vanillaUi = "client-sdk-vanilla-ui",
}

export enum baseUrls {
    prod = "https://www.crossmint.com",
    staging = "https://staging.crossmint.com",
    dev = "http://localhost:3001",
}

export type PaymentMethod = "fiat" | "ETH" | "SOL";
export const paymentMethodIsEth = (paymentMethod?: PaymentMethod) => paymentMethod === "ETH";
export const paymentMethodIsSol = (paymentMethod?: PaymentMethod) => paymentMethod === "SOL";

export type Locale =
    | "en-US"
    | "es-ES"
    | "fr-FR"
    | "it-IT"
    | "ko-KR"
    | "pt-PT"
    | "zh-CN"
    | "zh-TW"
    | "de-DE"
    | "ru-RU"
    | "tr-TR"
    | "uk-UA"
    | "th-TH"
    | "Klingon";

export type Currency = "usd" | "eur" | "gbp" | "aud" | "sgd" | "hkd" | "krw" | "inr";

export interface FiatPrice {
    amount: string;
    currency: Currency;
}

export type Recipient = {
    email?: string;
    wallet?: string;
};
