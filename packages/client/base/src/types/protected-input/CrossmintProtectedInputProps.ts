import type { z } from "zod";

import type { PaymentMethodManagementAppearance } from "../payment-method-management/CrossmintPaymentMethodManagementProps";
import type { protectedInputIncomingEvents } from "./events/incoming";

/** Same shape as the payment-method-management appearance, minus `rules`: the hosted page renders a single field. */
export type ProtectedInputAppearance = Omit<PaymentMethodManagementAppearance, "rules">;

/**
 * Payload of `protected-input:created`. Only the server-side handle and its metadata cross the
 * iframe boundary: never the password, never the vault token id.
 */
export type ProtectedInputCreated = z.infer<(typeof protectedInputIncomingEvents)["protected-input:created"]>;

/**
 * Payload of `protected-input:error`. Codes the hosted page posts: `protected_input_failed`
 * (registration call failed), `provider_unavailable` (the vault widget could not load),
 * `invalid_params` (the page rejected the query params). Codes the SDK component adds:
 * `missing_jwt` (no buyer JWT in the Crossmint context) and `load_timeout` (the hosted page
 * never reported in). See `PROTECTED_INPUT_ERROR_CODES`.
 */
export type ProtectedInputError = z.infer<(typeof protectedInputIncomingEvents)["protected-input:error"]>;

export interface CrossmintProtectedInputProps {
    /**
     * The merchant sign-in page the password is for. Its host becomes the input's merchant
     * domain; Universal Checkout may only use the input on that host or a subdomain of it.
     */
    merchantUrl: string;
    /** ISO 8601 datetime. Server default is 24 hours from creation; the maximum is 7 days. */
    expiresAt?: string;
    /** Text shown above the field, for example the merchant name. At most 120 characters. */
    label?: string;
    appearance?: ProtectedInputAppearance;
    /** Called once with the opaque `protectedInputId` to hand to Universal Checkout. */
    onCreated?: (created: ProtectedInputCreated) => void;
    onError?: (error: ProtectedInputError) => void;
}
