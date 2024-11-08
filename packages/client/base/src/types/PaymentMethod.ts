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
