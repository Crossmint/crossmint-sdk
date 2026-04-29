import type { EmbeddedCheckoutV3Appearance } from "../embed";

export type PaymentMethodManagementMode = "select-or-add" | "add-only";
export type PaymentMethodManagementAllowedType = "card";

export interface CrossmintPaymentMethodManagementProps {
    jwt?: string;
    mode?: PaymentMethodManagementMode;
    allowedPaymentMethodTypes?: PaymentMethodManagementAllowedType[];
    appearance?: EmbeddedCheckoutV3Appearance;
    onPaymentMethodSelected?: (paymentMethod: CrossmintPaymentMethod) => void | Promise<void>;
}

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

export type CrossmintCardToken = {
    id: string;
    billing?: {
        name?: string;
    };
};

export type CrossmintPaymentMethod =
    | { type: "card"; paymentMethod: CrossmintCardPaymentMethod }
    | { type: "card-token"; cardToken: CrossmintCardToken };
