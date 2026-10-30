import type { OrderIntentRegistration } from "./orderIntentsApi";

/**
 * Whether a card still has to be registered before an order intent is created on it. A
 * registration exists once the server lists any agentic-token rail for the card, whatever its
 * status: `enabled` is usable, `pending` means the server is still enrolling, and `error`
 * means the card is not eligible for that provider, which another `PUT` will not change. In
 * all three the order intent decides which rails are usable (the `encrypted-card` rail can
 * still serve a card with no agentic-token provider). Only a missing registration, an empty
 * rail list, or a registration that lists no agentic-token rail at all (for example `spt`
 * only) calls for a `PUT`, which is idempotent and never prompts the buyer.
 * @experimental
 */
export function needsOrderIntentRegistration(registration: OrderIntentRegistration | null): boolean {
    if (registration == null) {
        return true;
    }
    return !registration.rails.some((rail) => rail.rail === "agentic-token");
}
