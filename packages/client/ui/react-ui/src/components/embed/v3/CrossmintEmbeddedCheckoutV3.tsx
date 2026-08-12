import { EmbeddedCheckoutV3IFrame } from "./EmbeddedCheckoutV3IFrame";
import type { CrossmintEmbeddedCheckoutV3WebProps } from "@crossmint/client-sdk-base";

export function CrossmintEmbeddedCheckout(props: CrossmintEmbeddedCheckoutV3WebProps) {
    return <EmbeddedCheckoutV3IFrame {...props} />;
}
