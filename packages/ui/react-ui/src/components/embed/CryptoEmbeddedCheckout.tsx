import { CryptoEmbeddedCheckoutProps } from "@crossmint/client-sdk-base";

import CrossmintEmbeddedCheckoutIFrame from "./EmbeddedCheckoutIFrame";

export function CrossmintCryptoEmbeddedCheckout(props: CryptoEmbeddedCheckoutProps) {
    const { signer } = props;

    if (signer == null) {
        throw new Error("Invalid parameters: signer is required in versions < 2.0.0");
    }

    return <CrossmintEmbeddedCheckoutIFrame {...props} />;
}
