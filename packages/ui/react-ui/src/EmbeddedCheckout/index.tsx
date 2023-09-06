import React from "react";

import {
    CrossmintEmbeddedCheckoutProps,
    CryptoEmbeddedCheckoutProps,
    CryptoPaymentMethod,
    FiatEmbeddedCheckoutProps,
} from "@crossmint/client-sdk-base";

import { CrossmintFiatPaymentElement_OLD } from "./FiatPaymentElement_OLD";

// TODO: Rename to CrossmintEmbeddedCheckout
export function CrossmintPaymentElement(props: CrossmintEmbeddedCheckoutProps) {
    if (isFiatEmbeddedCheckoutProps(props)) {
        return <CrossmintFiatPaymentElement_OLD {...props} />;
    }
    if (isCryptoEmbeddedCheckoutProps(props)) {
        return <p>Unsupported: Fiat is the only supported payment method.</p>;
    }
    throw new Error("Unsupported: Fiat is the only supported payment method.");
}

function isFiatEmbeddedCheckoutProps(props: CrossmintEmbeddedCheckoutProps): props is FiatEmbeddedCheckoutProps {
    return props.paymentMethod == null || props.paymentMethod === "fiat";
}

function isCryptoEmbeddedCheckoutProps(
    props: CrossmintEmbeddedCheckoutProps
): props is { [K in CryptoPaymentMethod]: CryptoEmbeddedCheckoutProps<K> }[CryptoPaymentMethod] {
    return (Object.values(CryptoPaymentMethod) as string[]).includes(props.paymentMethod ?? "");
}
