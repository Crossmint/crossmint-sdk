import {
    type CrossmintEmbeddedCheckoutProps,
    isCryptoEmbeddedCheckoutProps,
    isFiatEmbeddedCheckoutProps,
} from "@crossmint/client-sdk-base";

import { CrossmintCryptoEmbeddedCheckout } from "./crypto/CryptoEmbeddedCheckout";
import { CrossmintFiatEmbeddedCheckout } from "./fiat/FiatEmbeddedCheckout";

export function CrossmintPaymentElement_DEPRECATED(props: CrossmintEmbeddedCheckoutProps) {
    console.error(
        "[CrossmintPaymentElement_DEPRECATED] ⚠️ This SDK version is deprecated. Please upgrade to Embedded Checkout V3 for improved performance, simplified integration, and enhanced functionality. Learn more: https://docs.crossmint.com/nft-checkout/embedded/overview"
    );

    if (isFiatEmbeddedCheckoutProps(props)) {
        return <CrossmintFiatEmbeddedCheckout {...props} />;
    }
    if (isCryptoEmbeddedCheckoutProps(props)) {
        return <CrossmintCryptoEmbeddedCheckout {...props} />;
    }
    throw new Error("Unsupported: Fiat is the only supported payment method.");
}
