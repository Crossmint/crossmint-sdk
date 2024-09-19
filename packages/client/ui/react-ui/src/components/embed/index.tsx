import {
    type CrossmintEmbeddedCheckoutProps,
    isCryptoEmbeddedCheckoutProps,
    isFiatEmbeddedCheckoutProps,
} from "@crossmint/client-sdk-base";

import { CrossmintCryptoEmbeddedCheckout } from "./crypto/CryptoEmbeddedCheckout";
import { CrossmintFiatEmbeddedCheckout } from "./fiat/FiatEmbeddedCheckout";

// TODO: Rename to CrossmintEmbeddedCheckout on v2 major publish, prior announcement since its a breaking change
export function CrossmintPaymentElement(props: CrossmintEmbeddedCheckoutProps) {
    if (isFiatEmbeddedCheckoutProps(props)) {
        return <CrossmintFiatEmbeddedCheckout {...props} />;
    }
    if (isCryptoEmbeddedCheckoutProps(props)) {
        return <CrossmintCryptoEmbeddedCheckout {...props} />;
    }
    throw new Error("Unsupported: Fiat is the only supported payment method.");
}
