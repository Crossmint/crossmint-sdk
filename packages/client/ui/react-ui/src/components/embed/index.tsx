import {
    type CrossmintEmbeddedCheckoutProps,
    isCryptoEmbeddedCheckoutProps,
    isFiatEmbeddedCheckoutProps,
} from "@crossmint/client-sdk-base";

import { CrossmintCryptoEmbeddedCheckout } from "./crypto/CryptoEmbeddedCheckout";
import { CrossmintFiatEmbeddedCheckout } from "./fiat/FiatEmbeddedCheckout";

// TODO: Rename to CrossmintEmbeddedCheckout on v2 major publish, prior announcement since its a breaking change
export function CrossmintPaymentElement_DEPRECATED(props: CrossmintEmbeddedCheckoutProps) {
    console.error(
        "[CrossmintPaymentElement_DEPRECATED] 🚨 This SDK is now deprecated. We encourage you to migrate to our Embedded Checkout V3, which is faster, easier to integrate and provides many more functionality. Read the docs here: https://docs.crossmint.com/nft-checkout/embedded/overview"
    );

    if (isFiatEmbeddedCheckoutProps(props)) {
        return <CrossmintFiatEmbeddedCheckout {...props} />;
    }
    if (isCryptoEmbeddedCheckoutProps(props)) {
        return <CrossmintCryptoEmbeddedCheckout {...props} />;
    }
    throw new Error("Unsupported: Fiat is the only supported payment method.");
}
