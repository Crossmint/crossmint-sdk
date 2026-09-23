import type { CrossmintAgentCardAuthorizationProps } from "@crossmint/client-sdk-base";

import { CrossmintPaymentMethodManagement } from "../card-management";
import { CrossmintCvcRecollection, OrderIntentVerification } from "../order-intent";
import { useAgentCardAuthorization } from "./useAgentCardAuthorization";

/**
 * Lets a buyer authorize a bounded card spend for Universal Checkout and hands back an
 * `orderIntentId`. Composes card selection, order-intent registration, order-intent creation
 * and rail verification; the rail is chosen by a fixed policy, never by the model or the
 * buyer. The card number, CVC and vault token id never reach this component's callbacks.
 */
export function CrossmintAgentCardAuthorization(props: CrossmintAgentCardAuthorizationProps) {
    const { jwt, step, onPaymentMethodSelected, onRailStepComplete, onRailStepError } =
        useAgentCardAuthorization(props);

    if (jwt == null || step.kind === "done") {
        return null;
    }

    if (step.kind === "verify") {
        return (
            <OrderIntentVerification
                orderIntent={step.orderIntent}
                displayName={props.displayName}
                appearance={props.appearance?.verification}
                onVerificationComplete={() => onRailStepComplete(step)}
                onVerificationError={onRailStepError}
            />
        );
    }

    if (step.kind === "cvc") {
        return (
            <CrossmintCvcRecollection
                jwt={jwt}
                paymentMethodId={step.paymentMethod.id}
                appearance={props.appearance?.paymentMethodManagement}
                onComplete={() => onRailStepComplete(step)}
                onError={(error) => {
                    // A retriable error keeps the form mounted so the buyer can resubmit.
                    if (!error.retriable) {
                        onRailStepError(new Error(error.message));
                    }
                }}
            />
        );
    }

    return (
        <CrossmintPaymentMethodManagement
            jwt={jwt}
            allowedModes={props.allowedModes ?? ["existing", "new"]}
            allowedPaymentMethodTypes={["card"]}
            appearance={props.appearance?.paymentMethodManagement}
            onPaymentMethodSelected={onPaymentMethodSelected}
        />
    );
}
