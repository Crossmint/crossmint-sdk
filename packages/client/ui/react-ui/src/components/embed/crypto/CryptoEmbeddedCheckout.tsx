import { type CryptoEmbeddedCheckoutProps, isCryptoEmbeddedCheckoutPropsWithSigner } from "@crossmint/client-sdk-base";

import CryptoEmbeddedCheckoutIFrame from "./CryptoEmbeddedCheckoutIFrame";

export function CrossmintCryptoEmbeddedCheckout(props: CryptoEmbeddedCheckoutProps) {
    if (!isCryptoEmbeddedCheckoutPropsWithSigner(props)) {
        throw new Error("Invalid parameters: signer is required in versions < 2.0.0");
    }

    return <CryptoEmbeddedCheckoutIFrame {...props} />;
}
