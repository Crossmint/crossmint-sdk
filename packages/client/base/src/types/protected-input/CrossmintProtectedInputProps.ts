import type { PaymentMethodManagementAppearance } from "../payment-method-management/CrossmintPaymentMethodManagementProps";

export type ProtectedInputAppearance = Omit<PaymentMethodManagementAppearance, "rules">;

/** Public UC field descriptor. Browser bindings and values never enter this contract. */
export type ProtectedInputField = {
    key: string;
    label: string;
    required: boolean;
    handling: "protected";
    input:
        | {
              kind: "text";
              multiline?: false;
              placeholder?: string;
              display?: "masked";
              autoComplete?:
                  | "on"
                  | "off"
                  | "name"
                  | "given-name"
                  | "family-name"
                  | "email"
                  | "username"
                  | "tel"
                  | "current-password"
                  | "new-password"
                  | "one-time-code"
                  | "street-address"
                  | "postal-code";
              inputMode?: "none" | "text" | "decimal" | "numeric" | "tel" | "search" | "email" | "url";
          }
        | { kind: "number" | "integer" };
};

export type ProtectedInputCollectionResult =
    | { status: "collected"; input: { protectedInputId: string } }
    | { status: "invalid" | "unavailable"; code: string; message: string }
    | { status: "superseded"; message: string };

export interface CrossmintProtectedInputRef {
    collect(): Promise<ProtectedInputCollectionResult>;
}

export interface CrossmintProtectedInputProps {
    /** Buyer's JWT from the application's external auth integration. */
    jwt: string;
    field: ProtectedInputField;
    /** ISO 8601; server default is 24 hours, maximum is 7 days. */
    expiresAt?: string;
    appearance?: ProtectedInputAppearance;
    disabled?: boolean;
    /** Controls the visual invalid state; the developer renders the error message. */
    invalid?: boolean;
}
