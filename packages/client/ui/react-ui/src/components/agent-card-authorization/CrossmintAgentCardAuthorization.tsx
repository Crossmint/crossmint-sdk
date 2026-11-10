import type {
    CrossmintAgentCardAuthorizationProps,
    CrossmintPaymentMethodManagementRef,
} from "@crossmint/client-sdk-base";

import { useRef, useState } from "react";
import { CrossmintPaymentMethodManagement } from "../card-management/CrossmintPaymentMethodManagement";
import { CrossmintCvcRecollection, OrderIntentVerification } from "../order-intent";
import { useAgentCardAuthorization } from "./useAgentCardAuthorization";

/**
 * Lets a buyer authorize a bounded card spend for Agent Checkouts and hands back an
 * `orderIntentId`. Composes card selection, order-intent registration, order-intent creation
 * and rail verification; the rail is chosen by a fixed policy, never by the model or the
 * buyer. The card number, CVC and vault token id never reach this component's callbacks.
 */
export function CrossmintAgentCardAuthorization(props: CrossmintAgentCardAuthorizationProps) {
    const { jwt, step, onPaymentMethodSelected, onRailStepComplete, onRailStepError } =
        useAgentCardAuthorization(props);

    if (step.kind === "done") {
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

    return <CardSelectionStep props={props} jwt={jwt} onPaymentMethodSelected={onPaymentMethodSelected} />;
}

// The payment-method iframe renders no button, so this step owns the submit: the button calls
// `ref.submit()`, which also emits `payment-method:selected` and drives `onPaymentMethodSelected`.
function CardSelectionStep({
    props,
    jwt,
    onPaymentMethodSelected,
}: {
    props: CrossmintAgentCardAuthorizationProps;
    jwt: string;
    onPaymentMethodSelected: (paymentMethod: unknown) => void;
}) {
    const pmm = useRef<CrossmintPaymentMethodManagementRef>(null);
    const [submitting, setSubmitting] = useState(false);
    const [submitError, setSubmitError] = useState<string | null>(null);

    async function submit() {
        setSubmitting(true);
        setSubmitError(null);
        try {
            const result = await pmm.current?.submit();
            if (
                result != null &&
                result.status !== "selected" &&
                result.status !== "saved" &&
                result.status !== "superseded"
            ) {
                setSubmitError(result.message);
            }
        } finally {
            setSubmitting(false);
        }
    }

    const primaryButton = props.appearance?.paymentMethodManagement?.rules?.PrimaryButton;
    const background = submitting
        ? primaryButton?.disabled?.colors?.background ?? "#e7e9ed"
        : primaryButton?.colors?.background ?? "#05B959";
    const color = submitting ? "#67797f" : primaryButton?.colors?.text ?? "#ffffff";

    return (
        <div>
            <CrossmintPaymentMethodManagement
                ref={pmm}
                jwt={jwt}
                allowedModes={props.allowedModes ?? ["existing", "new"]}
                allowedPaymentMethodTypes={["card"]}
                appearance={props.appearance?.paymentMethodManagement}
                onPaymentMethodSelected={onPaymentMethodSelected}
            />
            <button
                type="button"
                disabled={submitting}
                onClick={() => void submit()}
                style={{
                    width: "100%",
                    height: 50,
                    marginTop: 16,
                    border: "none",
                    cursor: submitting ? "default" : "pointer",
                    borderRadius: primaryButton?.borderRadius ?? "12px",
                    backgroundColor: background,
                    color,
                    fontSize: 14,
                    fontWeight: 600,
                }}
            >
                {submitting ? "Saving…" : "Continue"}
            </button>
            {submitError != null && (
                <p role="alert" style={{ marginTop: 8, fontSize: 14, color: "#DC2626" }}>
                    {submitError}
                </p>
            )}
        </div>
    );
}
