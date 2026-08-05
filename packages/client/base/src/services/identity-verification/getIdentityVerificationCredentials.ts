import type { Order } from "@/lib/hosted-checkout/Order";
import type { IdentityVerificationCredentials } from "@/types/identity-verification/CrossmintIdentityVerificationProps";

/**
 * Reads an order's verification credentials, for a merchant taking the step over with
 * `kycHandling="external"`. Undefined until the order needs verification.
 */
export function getIdentityVerificationCredentials(order: Order): IdentityVerificationCredentials | undefined {
    // Cast because this Order type mirrors the backend schema by hand and does not model the kyc
    // preparation variant yet.
    // Optional chained because an order reaches the merchant over postMessage, where the type is a
    // promise rather than a guarantee.
    const preparation = order.payment?.preparation as { kyc?: IdentityVerificationCredentials } | undefined;
    return preparation?.kyc;
}
