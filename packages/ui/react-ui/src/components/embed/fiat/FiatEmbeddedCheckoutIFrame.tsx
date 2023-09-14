import { FiatEmbeddedCheckoutProps } from "@crossmint/client-sdk-base";

import CrossmintEmbeddedCheckoutIFrame from "../EmbeddedCheckoutIFrame";

export default function FiatEmbeddedCheckoutIFrame(props: FiatEmbeddedCheckoutProps) {
    throw new Error(
        "Unsupported: This component should not be called yet, as its a placeholder for the v2 fiat checkout."
    );
    return <CrossmintEmbeddedCheckoutIFrame {...props} />;
}
