import { EmbeddedCheckoutV3WebView } from "./EmbeddedCheckoutV3WebView";
import type { CrossmintEmbeddedCheckoutV3Props } from "@crossmint/client-sdk-base";

export function CrossmintEmbeddedCheckout(props: CrossmintEmbeddedCheckoutV3Props) {
    return <EmbeddedCheckoutV3WebView {...props} />;
}
