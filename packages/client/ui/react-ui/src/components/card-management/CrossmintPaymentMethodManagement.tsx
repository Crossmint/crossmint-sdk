import { CrossmintPaymentMethodManagementIFrame } from "./CrossmintPaymentMethodManagementIFrame";
import type { CrossmintPaymentMethodManagementProps } from "@crossmint/client-sdk-base";

/**
 * Lets the user save a new card or bank account, or pick one of their saved payment methods.
 * Rendered in a Crossmint-hosted iframe, so payment details never touch your app.
 * Takes the user's Crossmint `jwt`. `onPaymentMethodSelected` receives the chosen method;
 * its `paymentMethodId` is what your backend uses to pay (for example to create order intents).
 */
export function CrossmintPaymentMethodManagement(props: CrossmintPaymentMethodManagementProps) {
    return <CrossmintPaymentMethodManagementIFrame {...props} />;
}
