import { CrossmintCvcRecollectionIFrame } from "./CrossmintCvcRecollectionIFrame";
import type { CrossmintCvcRecollectionProps, CrossmintCvcRecollectionRef } from "@crossmint/client-sdk-base";
import { forwardRef, useContext } from "react";
import { LoggerContext } from "../../providers/CrossmintProvider";

/**
 * Asks the user to enter a saved card's CVC again. Render it when an order intent's
 * `encrypted-card` rail reports `status: "pending_cvc_recollection"`, then refetch
 * the order intent from `onComplete`.
 *
 * To use your own button instead of the component's, pass `hideSubmitButton` and a `ref`,
 * and call `ref.current.submit()` from your button: it resolves with `complete`, or with
 * why the submit could not complete.
 */
export const CrossmintCvcRecollection = forwardRef<CrossmintCvcRecollectionRef, CrossmintCvcRecollectionProps>(
    function CrossmintCvcRecollection(props, ref) {
        const logger = useContext(LoggerContext);
        const { paymentMethodId, onComplete, onError } = props;
        return (
            <CrossmintCvcRecollectionIFrame
                {...props}
                ref={ref}
                onComplete={() => {
                    logger?.info("react.cvcRecollection.success", { paymentMethodId });
                    onComplete?.();
                }}
                onError={(error) => {
                    logger?.[error.retriable ? "info" : "warn"]("react.cvcRecollection.failed", {
                        paymentMethodId,
                        reason: error.reason,
                        retriable: error.retriable,
                    });
                    onError?.(error);
                }}
            />
        );
    }
);
