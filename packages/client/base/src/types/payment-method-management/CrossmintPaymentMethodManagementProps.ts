import type { EmbeddedCheckoutV3Appearance } from "../embed";

export interface CrossmintPaymentMethodManagementProps {
    jwt: string;
    appearance?: PaymentMethodManagementAppearance;
    onPaymentMethodSelected?: (paymentMethod: CrossmintPaymentMethod) => void | Promise<void>;
}

export type CrossmintPaymentMethod = {
    type: "card";
    paymentMethodId: string;
    card: {
        brand: string;
        last4: string;
        expiration: {
            // 2 digit month
            month: string;
            // 4 digit year
            year: string;
        };
    };
};

export type PaymentMethodManagementAppearance = {
    fonts?: EmbeddedCheckoutV3Appearance["fonts"];
    variables?: EmbeddedCheckoutV3Appearance["variables"];
};
