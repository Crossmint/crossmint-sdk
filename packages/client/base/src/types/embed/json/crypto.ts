import { CommonEmbeddedCheckoutPropsJSONStringified } from ".";
import { CommonEmbeddedCheckoutSignerProps, CryptoPaymentMethodSignerMap } from "../crypto";

export type CryptoEmbeddedCheckoutPropsJSONStringified<
    PM extends keyof CryptoPaymentMethodSignerMap = keyof CryptoPaymentMethodSignerMap,
> = CommonEmbeddedCheckoutPropsJSONStringified<PM> & {
    paymentMethod: PM;
    signer?: string;
};

export type CryptoEmbeddedCheckoutPropsJSONParsed<
    PM extends keyof CryptoPaymentMethodSignerMap = keyof CryptoPaymentMethodSignerMap,
> = CommonEmbeddedCheckoutPropsJSONStringified<PM> & {
    paymentMethod: PM;
    signer?: CommonEmbeddedCheckoutSignerProps;
};
