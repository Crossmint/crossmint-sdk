import type { EmbeddedCheckoutV3Appearance } from "../embed";

/**
 * Which payment-method types the management UI offers in its "add new" section.
 * Bounded by the vault proxy's tokenizable types; LM0 ships rendering for a
 * single allowed type (the first supported entry).
 */
export type PaymentMethodManagementAllowedType = "card" | "bank-account-us";

/** How the add-card form treats address line 2: shown and optional (default), shown and required, or not shown. */
export type PaymentMethodBillingAddressLine2 = "optional" | "required" | "hidden";

/** Starting values of the add-card form. See `CrossmintPaymentMethodManagementProps.defaultValues`. */
export type PaymentMethodManagementDefaultValues = {
    /** `null` at any level means no default, like a missing key. */
    billingDetails?: {
        /** `null` or an empty string means no default for that field. */
        address?: {
            /**
             * Uppercase ISO 3166-1 alpha-2 code, for example `"ES"`. Without it, the form starts
             * in the US.
             */
            country?: string | null;
            line1?: string | null;
            line2?: string | null;
            city?: string | null;
            /**
             * ISO 3166-2 subdivision code of the starting country, without the country prefix:
             * `"FL"` (not `"US-FL"`), `"ON"`, `"MU"` (Murcia, Spain), `"AGU"` (Aguascalientes,
             * Mexico). The match is exact: the iframe ignores a name (`"Florida"`) or a lowercase
             * code (`"fl"`) and logs a console warning. Without `country`, use a US code.
             */
            stateOrRegion?: string | null;
            postalCode?: string | null;
        } | null;
    } | null;
};

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
     * Optional fields of the add-card form, in Stripe's `billingDetails` shape so new
     * fields need no new prop. `billingDetails.address: true` collects a required
     * billing address: the card form validates it before saving — for built-in and
     * `ref.submit()` submissions alike — and it comes back on `card.billing.address`
     * of the emitted method. Applies to cards only; other method types ignore it.
     *
     * An object collects it too and configures the fields the payment-methods API
     * leaves optional: `{ line2: "optional" | "required" | "hidden" }`.
     * `true` equals `{ line2: "optional" }`.
     */
    fields?: { billingDetails?: { address?: boolean | { line2?: PaymentMethodBillingAddressLine2 } } };
    /**
     * Starting values of the add-card form, in the same `billingDetails` shape as `fields`.
     * The buyer can edit every value. `null` or an empty string means no default for that
     * field, so values from a database can pass as they are. The form uses them only when
     * `fields.billingDetails.address` collects an address.
     *
     * The iframe checks each value on its own: it ignores an invalid value and logs a console
     * warning, and keeps the other values. It drops a `line2` default when
     * `fields.billingDetails.address.line2` is `"hidden"`.
     *
     * The values travel in the iframe URL. A change after mount reloads the iframe, so pass
     * stable values (for example, memoize the object).
     */
    defaultValues?: PaymentMethodManagementDefaultValues | null;
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
         * was saved with `fields.billingDetails.address` (or the account has one on file).
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
