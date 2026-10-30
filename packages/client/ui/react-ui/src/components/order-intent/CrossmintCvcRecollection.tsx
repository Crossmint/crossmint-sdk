import { CrossmintCvcRecollectionIFrame } from "./CrossmintCvcRecollectionIFrame";
import type { CrossmintCvcRecollectionProps, CrossmintCvcRecollectionRef } from "@crossmint/client-sdk-base";
import { forwardRef } from "react";

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
        return <CrossmintCvcRecollectionIFrame {...props} ref={ref} />;
    }
);
