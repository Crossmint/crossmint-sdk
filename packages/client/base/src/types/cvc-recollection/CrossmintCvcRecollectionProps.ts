import type { z } from "zod";

import type { PaymentMethodManagementAppearance } from "../payment-method-management/CrossmintPaymentMethodManagementProps";
import type { cvcRecollectionIncomingEvents } from "./events/incoming";

/**
 * Error reported by `CrossmintCvcRecollection` through `onError`.
 *
 * `retriable: true` means the hosted form stays mounted and the user can submit again
 * (wrong CVC, provider rejection, `verification-refused` when Crossmint could not confirm the
 * new CVC, transient failure). `retriable: false` means the flow is dead and the user cannot
 * finish it: the component renders nothing afterwards, so the parent has to show its own
 * message (and, for `invalid-configuration`, fix the props).
 */
export type CvcRecollectionError = z.infer<(typeof cvcRecollectionIncomingEvents)["cvc:error"]>;

/**
 * Props of `CrossmintCvcRecollection`.
 *
 * Render the component when an order intent's `encrypted-card` rail reports
 * `status: "pending_cvc_recollection"`, or when creating a credential for that rail is refused
 * with HTTP 409 `ORDER_INTENT_CVC_RECOLLECTION_REQUIRED`. A rail read as `active` can still
 * answer that 409 if the CVC expires before the mint; handle both.
 *
 * After `onComplete`, re-read the order intent: the rail goes back to `active`.
 */
export interface CrossmintCvcRecollectionProps {
    /** The user's Crossmint auth token, the same one `CrossmintPaymentMethodManagement` takes. */
    jwt: string;
    /** The saved card whose CVC has to be entered again. */
    paymentMethodId: string;
    /**
     * Same appearance model as `CrossmintPaymentMethodManagement` and the embedded checkout,
     * not the one of the verification modal: `variables.fontSizeUnit` / `spacingUnit` are
     * multiplier units (defaults `"4px"` / `"3.33px"`), not base sizes. See
     * `EmbeddedCheckoutV3AppearanceVariables`.
     */
    appearance?: PaymentMethodManagementAppearance;
    /**
     * Render no Confirm button inside the component (default `false`). Pair it with a
     * `ref` and call `ref.current.submit()` from your own button.
     */
    hideSubmitButton?: boolean;
    /** Called once Crossmint has stored the new CVC. Receives no CVC and no token payload. */
    onComplete?: () => void;
    onError?: (error: CvcRecollectionError) => void;
}

/**
 * What `ref.submit()` resolves to. It never rejects.
 * - `complete`: the new CVC was stored; `onComplete` also fired.
 * - `invalid`: the CVC is empty or incomplete; the component shows the field error.
 * - `failed`: the update failed with a message the user can read; they can try again.
 * - `refused`: the flow is dead, with the same `reason`/`message` `onError` reported; the
 *   user cannot finish it.
 * - `unavailable`: the component is not ready (not loaded, still loading the form, or it
 *   did not answer in time). After a timeout the update may still have completed:
 *   `onComplete` fires if it did, and submitting again returns `complete`.
 * - `superseded`: the component changed or unmounted while submitting. Discard the result;
 *   this does not cancel an update already started on the server.
 */
export type CvcRecollectionSubmitResult =
    | { status: "complete" }
    | { status: "invalid"; message: string }
    | { status: "failed"; message: string }
    | { status: "refused"; reason: CvcRecollectionError["reason"]; message: string }
    | { status: "unavailable"; message: string }
    | { status: "superseded"; message: string };

export interface CrossmintCvcRecollectionRef {
    /**
     * Runs the same confirm the component's own button would. A call while one is in flight
     * returns the same promise. Calling it again after `complete` returns `complete` again;
     * nothing is updated twice. A change of card, configuration, or iframe connection
     * supersedes any pending submit.
     */
    submit(): Promise<CvcRecollectionSubmitResult>;
}
