import React from "react";

import { FiatPaymentElementProps, PaymentElementProps } from "@crossmint/client-sdk-base";

import { CrossmintFiatPaymentElement } from "./FiatPaymentElement";

export function CrossmintPaymentElement(props: PaymentElementProps) {
    if (isFiatPaymentElementProps(props)) {
        return <CrossmintFiatPaymentElement {...props} />;
    }
    throw new Error("Unsupported: Fiat is the only supported payment method.");
}

function isFiatPaymentElementProps(props: PaymentElementProps): props is FiatPaymentElementProps {
    return props.paymentMethod == null || props.paymentMethod === "fiat";
}
