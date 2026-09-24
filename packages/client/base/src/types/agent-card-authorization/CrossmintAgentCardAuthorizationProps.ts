import type { OrderIntent, OrderIntentMerchant, OrderIntentProvider } from "../payment-method-management/OrderIntents";
import type { PaymentMethodManagementAppearance } from "../payment-method-management/CrossmintPaymentMethodManagementProps";
import type { VerificationAppearance } from "../payment-method-management/VerificationAppearance";

// The types below are the public contract of `CrossmintAgentCardAuthorization`. They sit on the
// `/api/unstable` order-intent routes, so they are @experimental: fields may change in a minor
// release until those routes stabilise.

/** Card details safe to display. Deliberately omits `card.source`, which carries a vault token id. */
export interface AgentCardPaymentMethodSummary {
    id: string;
    type: "card";
    brand: string;
    last4: string;
}

/** The rail Universal Checkout will draw the card credential from. */
export type AgentCardRail =
    | { rail: "agentic-token"; provider: OrderIntentProvider }
    | { rail: "encrypted-card"; provider?: never };

export interface AgentCardAuthorizationResult {
    /** Pass this to Universal Checkout as `payment: { orderIntentId }` or as the `payment` input response. */
    orderIntentId: string;
    paymentMethod: AgentCardPaymentMethodSummary;
    rail: AgentCardRail;
    amount: OrderIntent["amount"];
    expiresAt: string;
}

export const AGENT_CARD_AUTHORIZATION_ERROR_CODES = [
    /** The payment-method UI reported something that is not a card, or a payload the SDK could not validate. */
    "payment_method_selection_failed",
    /** Reading or creating the order-intent registration of the card failed. */
    "registration_failed",
    /** `POST /api/unstable/order-intents` failed. */
    "order_intent_creation_failed",
    /** Rail verification failed, or the rail never became active after verification. */
    "verification_failed",
    /** The order intent has no card-capable rail, or every card-capable rail is in error. */
    "rail_unavailable",
    /** The order intent expired or was cancelled before it could be used. */
    "expired",
] as const;
export type AgentCardAuthorizationErrorCode = (typeof AGENT_CARD_AUTHORIZATION_ERROR_CODES)[number];

export interface AgentCardAuthorizationError {
    code: AgentCardAuthorizationErrorCode;
    message: string;
}

export interface AgentCardAuthorizationAppearance {
    /** Styles the card selection and the CVC recollection form, which share this appearance model. */
    paymentMethodManagement?: PaymentMethodManagementAppearance;
    /** Styles the card-network verification modal. */
    verification?: VerificationAppearance;
}

export interface CrossmintAgentCardAuthorizationProps {
    /** The buyer's Crossmint auth token, the same one `CrossmintPaymentMethodManagement` takes. */
    jwt: string;
    /** `value` is a decimal string with up to 4 places, greater than 0; `currency` is a 3-letter code. */
    amount: { value: string; currency: string };
    merchant: OrderIntentMerchant;
    description: string;
    /** ISO 8601 datetime in the future. Defaults to 24 hours from mount. */
    expiresAt?: string;
    /** Sections of the payment-method UI to render. Defaults to `["existing", "new"]`. */
    allowedModes?: Array<"new" | "existing">;
    /** Shown to the buyer by the rail verification UI. */
    displayName: string;
    appearance?: AgentCardAuthorizationAppearance;
    onAuthorized: (result: AgentCardAuthorizationResult) => void;
    onError: (error: AgentCardAuthorizationError) => void;
}
