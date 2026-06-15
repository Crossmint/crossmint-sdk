import type { EmbeddedCheckoutV3Appearance } from "../embed";

/**
 * Which payment-method types the management UI offers in its "add new" section.
 * Bounded by the vault proxy's tokenizable types; LM0 ships rendering for a
 * single allowed type (the first supported entry).
 */
export type PaymentMethodManagementAllowedType = "card" | "bank-account-us";

export interface CrossmintPaymentMethodManagementProps {
    jwt: string;
    appearance?: PaymentMethodManagementAppearance;
    /**
     * Which sections the management UI renders. `["new"]` (default) shows only
     * the "add new" section: no saved-methods fetch, no auto-open/auto-select of
     * an existing method. Include `"existing"` to also show the saved-methods
     * section. (`["new"]` ≡ the old `new-only`; `["new","existing"]` ≡ the old
     * `new-and-existing`.)
     */
    allow?: Array<"new" | "existing">;
    /**
     * Filter array of which method types the "add new" section offers
     * (default `["card"]`). LM0 renders the first supported entry; passing more
     * than one type does not yet render a type picker.
     */
    allowedPaymentMethodTypes?: PaymentMethodManagementAllowedType[];
    onPaymentMethodSelected?: (paymentMethod: CrossmintPaymentMethod) => void | Promise<void>;
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
    };
    default?: boolean;
    display?: {
        imageUrl?: string;
    };
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
