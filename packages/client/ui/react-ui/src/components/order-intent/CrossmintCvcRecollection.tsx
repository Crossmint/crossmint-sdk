import type { CrossmintCvcRecollectionProps } from "@crossmint/client-sdk-base";
import { CrossmintCvcRecollectionIFrame } from "./CrossmintCvcRecollectionIFrame";

/**
 * Refreshes the vaulted CVC of a saved card. Render it when an order intent's
 * `encrypted-card` rail reports `status: "pending_cvc_recollection"`, then refetch
 * the order intent from `onComplete`.
 */
export function CrossmintCvcRecollection(props: CrossmintCvcRecollectionProps) {
    return <CrossmintCvcRecollectionIFrame {...props} />;
}
