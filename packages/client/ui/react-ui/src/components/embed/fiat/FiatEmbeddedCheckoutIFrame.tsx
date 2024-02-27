import { FiatEmbeddedCheckoutProps } from "@crossmint/client-sdk-base";

import CrossmintEmbeddedCheckoutIFrame from "../EmbeddedCheckoutIFrame";

export default function FiatEmbeddedCheckoutIFrame(props: FiatEmbeddedCheckoutProps) {
    return <CrossmintEmbeddedCheckoutIFrame {...props} />;
}
