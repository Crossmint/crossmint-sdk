import FiatEmbeddedCheckoutIFrame from "@/components/embed/fiat/FiatEmbeddedCheckoutIFrame";
import { FiatEmbeddedCheckoutProps } from "@crossmint/client-sdk-base";

export function CrossmintFiatEmbeddedCheckout(props: FiatEmbeddedCheckoutProps) {
    return <FiatEmbeddedCheckoutIFrame {...props} />;
}
