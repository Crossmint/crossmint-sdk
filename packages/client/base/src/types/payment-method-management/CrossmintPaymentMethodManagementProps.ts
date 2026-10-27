import type { EmbeddedCheckoutV3Appearance } from "../embed";

/**
 * Which payment-method types the management UI offers in its "add new" section.
 * Bounded by the vault proxy's tokenizable types; LM0 ships rendering for a
 * single allowed type (the first supported entry).
 */
export type PaymentMethodManagementAllowedType = "card" | "bank-account-us";

export interface CrossmintPaymentMethodManagementProps {
    /**
     * Pass a user JWT from your own auth provider or a custom JWT.
     * Crossmint Auth JWTs are not supported.
     */
    jwt: string;
    appearance?: PaymentMethodManagementAppearance;
    /**
     * Which sections the management UI renders. `["new"]` (default) shows only
     * the "add new" section: no saved-methods fetch, no auto-open/auto-select of
     * an existing method. Include `"existing"` to also show the saved-methods
     * section.
     */
    allowedModes?: Array<"new" | "existing">;
    /**
     * Filter array of which method types the "add new" section offers
     * (default `["card"]`). LM0 renders the first supported entry; passing more
     * than one type does not yet render a type picker.
     */
    allowedPaymentMethodTypes?: PaymentMethodManagementAllowedType[];
    /**
     * Render no Save/Continue button inside the component (default `false`). Pair it with a
     * `ref` and call `ref.current.submit()` from your own button.
     */
    hideSubmitButton?: boolean;
    /**
     * Also collect the card's billing address when adding a new card (default `false`).
     * When enabled, the card form requires a valid billing address before it saves —
     * for built-in and `ref.submit()` submissions alike. The collected address is saved
     * with the card and comes back on `card.billing.address` of the emitted method.
     * Applies to cards only; other method types ignore it.
     */
    collectBillingAddress?: boolean;
    onPaymentMethodSelected?: (paymentMethod: CrossmintPaymentMethod) => void | Promise<void>;
}

/**
 * What `ref.submit()` resolves to. It never rejects.
 * - `selected`: the user had a saved method selected; it is the one to use.
 * - `saved`: the method in the form was saved; `onPaymentMethodSelected` also fired.
 * - `invalid`: the form shows a field error the user has to fix.
 * - `failed`: the save failed with a message the user can read; they can try again.
 * - `unavailable`: the component is not ready (not loaded, still loading saved methods, or it
 *   did not answer in time). After a timeout the save may still have completed:
 *   `onPaymentMethodSelected` fires if it did, and submitting again returns the same method.
 * - `superseded`: the component changed or unmounted while submitting. Discard the result;
 *   this does not cancel a save already started on the server.
 */
export type PaymentMethodSubmitResult =
    | { status: "selected"; paymentMethod: CrossmintPaymentMethod }
    | { status: "saved"; paymentMethod: CrossmintPaymentMethod }
    | { status: "invalid"; message: string }
    | { status: "failed"; message: string }
    | { status: "unavailable"; message: string }
    | { status: "superseded"; message: string };

export interface CrossmintPaymentMethodManagementRef {
    /**
     * Submits what the component shows: the selected saved method, or the add-new form. A call
     * while one is in flight returns the same promise. Calling it again on an unchanged saved
     * form returns that method again; nothing is saved twice. A change of buyer, configuration,
     * or iframe connection supersedes any pending submit.
     */
    submit(): Promise<PaymentMethodSubmitResult>;
}

/**
 * A payment method surfaced to the integrator via `onPaymentMethodSelected`.
 * Discriminated on `type`; narrow before reading variant-specific fields.
 */
export type CrossmintPaymentMethod = CrossmintCardPaymentMethod | CrossmintBankAccountUSPaymentMethod;

export type CrossmintCardPaymentMethod = {
    type: "card";
    paymentMethodId: string;
    card: {
        source: {
            type: "basis-theory-token";
            id: string;
        };
        brand: string;
        last4: string;
        expiration: {
            // 2 digit month
            month: string;
            // 4 digit year
            year: string;
        };
        /**
         * Billing details the card was saved with. `address` is present when the card
         * was saved with `collectBillingAddress` (or the account has one on file).
         */
        billing?: CrossmintPaymentMethodBillingDetails;
    };
    default?: boolean;
    display?: {
        imageUrl?: string;
    };
};

export type CrossmintPaymentMethodBillingDetails = {
    name: string;
    address?: CrossmintPaymentMethodBillingAddress;
    phone?: string;
};

export type CrossmintPaymentMethodBillingAddress = {
    /** 2-letter ISO country code. */
    country: string;
    line1: string;
    line2?: string;
    city: string;
    stateOrRegion?: string;
    /** May be empty for countries whose address format has no postal code. */
    postalCode: string;
};

/**
 * US bank account. Carries only a safe display summary; intentionally omits any
 * token id or raw account number (the vault tokenizes those server-side).
 */
export type CrossmintBankAccountUSPaymentMethod = {
    type: "bank-account-us";
    paymentMethodId: string;
    bankAccount: {
        accountSuffix: string;
        bankName: string;
        accountType: "checking" | "savings";
    };
    default?: boolean;
    display?: {
        imageUrl?: string;
    };
};

export type PaymentMethodManagementAppearance = {
    fonts?: EmbeddedCheckoutV3Appearance["fonts"];
    variables?: EmbeddedCheckoutV3Appearance["variables"];
    rules?: EmbeddedCheckoutV3Appearance["rules"];
};
