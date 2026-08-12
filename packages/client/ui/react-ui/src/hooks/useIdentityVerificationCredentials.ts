import { getIdentityVerificationCredentials } from "@crossmint/client-sdk-base";
import { useCrossmintCheckout } from "./useCrossmintCheckout";

/**
 * Reads the current order's verification credentials, for a merchant taking the step over with
 * `identityVerificationHandling="external"`. Undefined until the order needs verification.
 */
export function useIdentityVerificationCredentials() {
    const { order } = useCrossmintCheckout();
    return getIdentityVerificationCredentials(order);
}
