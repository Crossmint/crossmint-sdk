import type { FiatEmbeddedCheckoutProps } from "@crossmint/client-sdk-base";

import FiatEmbeddedCheckoutIFrame from "../../../components/embed/fiat/FiatEmbeddedCheckoutIFrame";

export function CrossmintFiatEmbeddedCheckout(props: FiatEmbeddedCheckoutProps) {
    return <FiatEmbeddedCheckoutIFrame {...props} />;
}
