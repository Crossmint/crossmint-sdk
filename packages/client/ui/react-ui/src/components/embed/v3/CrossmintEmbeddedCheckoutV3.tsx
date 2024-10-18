import type { CrossmintEmbeddedCheckoutV3Props } from "@crossmint/client-sdk-base";

import { EmbeddedCheckoutV3IFrame } from "./EmbeddedCheckoutV3IFrame";

export function CrossmintEmbeddedCheckout_Alpha(props: CrossmintEmbeddedCheckoutV3Props) {
    return <EmbeddedCheckoutV3IFrame {...props} />;
}
