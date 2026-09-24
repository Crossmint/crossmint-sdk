import { CrossmintPaymentMethodManagementIFrame } from "./CrossmintPaymentMethodManagementIFrame";
import type { CrossmintPaymentMethodManagementProps } from "@crossmint/client-sdk-base";

/**
 * Lets the user save a new card or pick one of their saved payment methods, inside a
 * Crossmint-hosted iframe so card data never touches your app. Takes the user's Crossmint
 * `jwt`; `onPaymentMethodSelected` receives the chosen method, whose `paymentMethodId` is
 * what your backend registers to pay with (for example to create agent order intents).
 */
export function CrossmintPaymentMethodManagement(props: CrossmintPaymentMethodManagementProps) {
    return <CrossmintPaymentMethodManagementIFrame {...props} />;
}
