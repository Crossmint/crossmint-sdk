import type { z } from "zod";

import type { PaymentMethodManagementAppearance } from "../payment-method-management/CrossmintPaymentMethodManagementProps";
import type { cvcRecollectionIncomingEvents } from "./events/incoming";

/**
 * Error reported by `CrossmintCvcRecollection` through `onError`.
 *
 * `retriable: true` means the hosted form stays mounted and the user can submit again
 * (wrong CVC, provider rejection, transient failure). `retriable: false` means the flow is
 * dead and the user cannot finish it: the component renders nothing afterwards, so the
 * parent has to show its own message (and, for `invalid-configuration`, fix the props).
 */
export type CvcRecollectionError = z.infer<(typeof cvcRecollectionIncomingEvents)["cvc:error"]>;

/**
 * Props of `CrossmintCvcRecollection`.
 *
 * Render the component when an order intent's `encrypted-card` rail reports
 * `status: "pending_cvc_recollection"`, or when creating a credential for that rail is refused
 * with HTTP 409 `ORDER_INTENT_CVC_RECOLLECTION_REQUIRED`. The rail status is a read-time
 * snapshot of Crossmint's CVC clock (roughly 24 hours after the card was saved or the CVC last
 * refreshed), so an `active` rail can still turn into that 409 at mint time; handle both.
 *
 * After `onComplete`, re-read the order intent: the rail goes back to `active`.
 */
export interface CrossmintCvcRecollectionProps {
    /** The user's Crossmint auth token, the same one `CrossmintPaymentMethodManagement` takes. */
    jwt: string;
    /** The saved card whose vaulted CVC has to be refreshed. */
    paymentMethodId: string;
    /**
     * Same appearance model as `CrossmintPaymentMethodManagement` and the embedded checkout,
     * not the one of the verification modal: `variables.fontSizeUnit` / `spacingUnit` are
     * multiplier units (defaults `"4px"` / `"3.33px"`), not base sizes. See
     * `EmbeddedCheckoutV3AppearanceVariables`.
     */
    appearance?: PaymentMethodManagementAppearance;
    /** Called once the vault holds a fresh CVC. Receives no CVC and no token payload. */
    onComplete?: () => void;
    onError?: (error: CvcRecollectionError) => void;
}
