import type { Order } from "@/lib/hosted-checkout/Order";
import type { IdentityVerificationCredentials } from "@/types/identity-verification/CrossmintIdentityVerificationProps";

/**
 * Reads an order's verification credentials, for a merchant taking the step over with
 * `identityVerificationHandling="external"`. Undefined until the order needs verification.
 */
export function getIdentityVerificationCredentials(
    order: Order | undefined
): IdentityVerificationCredentials | undefined {
    // Cast and chained: this Order type is a hand-kept mirror with no kyc preparation variant, and
    // an order reaches the merchant over postMessage typed as `any`.
    const preparation = order?.payment?.preparation as { kyc?: IdentityVerificationCredentials } | undefined;
    return preparation?.kyc;
}
