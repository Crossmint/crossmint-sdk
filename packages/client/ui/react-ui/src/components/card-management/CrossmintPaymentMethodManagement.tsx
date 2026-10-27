import {
    CrossmintPaymentMethodManagementIFrame,
    type CrossmintPaymentMethodManagementElementProps,
} from "./CrossmintPaymentMethodManagementIFrame";
import type { CrossmintPaymentMethodManagementRef } from "@crossmint/client-sdk-base";
import { forwardRef } from "react";

/**
 * Lets the user save a new card or bank account, or pick one of their saved payment methods.
 * Rendered in a Crossmint-hosted iframe, so payment details never touch your app.
 * Pass a user JWT from your own auth provider or a custom JWT. Crossmint Auth JWTs are not supported.
 * `onPaymentMethodSelected` receives the chosen method. Your backend uses its `paymentMethodId` to pay.
 * It can use that ID to create order intents.
 *
 * To use your own button instead of the component's, pass `hideSubmitButton` and a `ref`, and
 * call `ref.current.submit()` from your button: it resolves with the selected or saved method,
 * or with why the submit could not complete. Pass that button as `children` and the component
 * renders it between the form and the "Powered by Crossmint" footer.
 */
export const CrossmintPaymentMethodManagement = forwardRef<
    CrossmintPaymentMethodManagementRef,
    CrossmintPaymentMethodManagementElementProps
>(function CrossmintPaymentMethodManagement(props, ref) {
    return <CrossmintPaymentMethodManagementIFrame {...props} ref={ref} />;
});
