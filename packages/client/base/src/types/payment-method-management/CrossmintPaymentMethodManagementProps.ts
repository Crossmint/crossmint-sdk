import type { EmbeddedCheckoutV3Appearance } from "../embed";

export interface CrossmintPaymentMethodManagementProps {
    jwt: string;
    appearance?: PaymentMethodManagementAppearance;
}

export type PaymentMethodManagementAppearance = {
    fonts?: EmbeddedCheckoutV3Appearance["fonts"];
    variables?: EmbeddedCheckoutV3Appearance["variables"];
};
