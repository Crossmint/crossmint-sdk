import React from "react";

import { CryptoPaymentElementProps } from "@crossmint/client-sdk-base";

export function CrossmintCryptoPaymentElement(props: CryptoPaymentElementProps) {
    return <p>Unsupported: Fiat is the only supported payment method.</p>;
}
