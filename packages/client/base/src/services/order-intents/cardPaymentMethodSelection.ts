import type { AgentCardPaymentMethodSummary } from "@/types/agent-card-authorization/CrossmintAgentCardAuthorizationProps";
import { z } from "zod";

// Only the fields the summary needs. `z.object` strips everything else, so `card.source` (a
// vault token id), `expiration`, `default` and `display` never make it past this point.
const selectedCardSchema = z.object({
    type: z.literal("card"),
    paymentMethodId: z.string().min(1),
    card: z.object({
        brand: z.string().min(1),
        last4: z.string().regex(/^\d{4}$/),
    }),
});

/**
 * Validates what the payment-method UI reported and reduces it to the display summary. Returns
 * `null` for anything that is not a well-formed card selection.
 * @experimental
 */
export function toAgentCardPaymentMethodSummary(paymentMethod: unknown): AgentCardPaymentMethodSummary | null {
    const result = selectedCardSchema.safeParse(paymentMethod);
    if (!result.success) {
        return null;
    }
    const { paymentMethodId, card } = result.data;
    return { id: paymentMethodId, type: "card", brand: card.brand, last4: card.last4 };
}
