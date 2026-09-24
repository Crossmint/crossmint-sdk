import type { CrossmintProtectedInputProps } from "@crossmint/client-sdk-base";
import { CrossmintProtectedInputIFrame } from "./CrossmintProtectedInputIFrame";

/**
 * Collects the password of the buyer's account on a merchant site inside a Crossmint-hosted
 * iframe and returns an opaque `protectedInputId` to hand to Universal Checkout. The password
 * never reaches this component, the developer's JavaScript, or the agent. Takes the buyer's
 * JWT as a prop, like `CrossmintPaymentMethodManagement`.
 */
export function CrossmintProtectedInput(props: CrossmintProtectedInputProps) {
    return <CrossmintProtectedInputIFrame {...props} />;
}
