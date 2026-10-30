import type { AgentCardRail } from "@/types/agent-card-authorization/CrossmintAgentCardAuthorizationProps";
import type {
    OrderIntentAgenticTokenRail,
    OrderIntentEncryptedCardRail,
    OrderIntentRail,
} from "@/types/payment-method-management/OrderIntents";

export type CardCapableRail = OrderIntentAgenticTokenRail | OrderIntentEncryptedCardRail;

export type SelectCardRailOptions = {
    /**
     * Whether the caller can run rail verification for this order intent (it carries a
     * `verificationConfig`). When false, a `pending_verification` rail is not a candidate.
     * Defaults to true.
     */
    canVerify?: boolean;
};

/**
 * Preference order, shared with `findCardRail`. Mirrors `selectRail` on the server
 * (Paella-Labs/crossbit-main, `libraries/products/payments/api/src/agent-checkouts/
 * agent-checkout-payment-credential.rails.ts`): change the two together.
 */
const CARD_RAIL_PREFERENCE: readonly AgentCardRail[] = [
    { rail: "agentic-token", provider: "vic" },
    { rail: "agentic-token", provider: "agentpay" },
    { rail: "encrypted-card" },
];

/** Same rail and provider as `selection`, and able to mint a `card` credential. */
function matchesSelection(rail: OrderIntentRail, selection: AgentCardRail): rail is CardCapableRail {
    if (rail.rail === "agentic-token") {
        return (
            selection.rail === "agentic-token" &&
            rail.provider === selection.provider &&
            rail.credentialFormats.includes("card")
        );
    }
    if (rail.rail === "encrypted-card") {
        return selection.rail === "encrypted-card" && rail.credentialFormats.includes("card");
    }
    return false;
}

function isCompletablePending(rail: CardCapableRail, canVerify: boolean): boolean {
    if (rail.status === "pending_verification") {
        return canVerify;
    }
    return rail.status === "pending_cvc_recollection";
}

/**
 * Picks the rail Universal Checkout will draw a card credential from, with the same policy
 * the server applies when it mints the credential: the first *active* rail in the order
 * `agentic-token`/`vic`, `agentic-token`/`agentpay`, `encrypted-card`, each only if its
 * credential formats include `card`. Only when nothing is active does a pending rail the
 * buyer can complete count, in the same order: `pending_verification` when `canVerify`,
 * `pending_cvc_recollection` always. Rails in `error` never count. Neither the model nor the
 * buyer takes part in this choice. Returns `null` when no card-capable rail is usable.
 * @experimental Follows the `/api/unstable` order-intent rails; may change in a minor release.
 */
export function selectCardRail(
    rails: OrderIntentRail[],
    { canVerify = true }: SelectCardRailOptions = {}
): CardCapableRail | null {
    for (const preferred of CARD_RAIL_PREFERENCE) {
        const active = rails.find(
            (rail): rail is CardCapableRail => matchesSelection(rail, preferred) && rail.status === "active"
        );
        if (active != null) {
            return active;
        }
    }
    for (const preferred of CARD_RAIL_PREFERENCE) {
        const pending = rails.find(
            (rail): rail is CardCapableRail =>
                matchesSelection(rail, preferred) && isCompletablePending(rail, canVerify)
        );
        if (pending != null) {
            return pending;
        }
    }
    return null;
}

/**
 * Identity of a chosen rail, so it can be found again after the order intent is re-read.
 * @experimental
 */
export function toAgentCardRail(rail: CardCapableRail): AgentCardRail {
    if (rail.rail === "agentic-token") {
        return { rail: "agentic-token", provider: rail.provider };
    }
    return { rail: "encrypted-card" };
}

/**
 * Finds the rail matching an earlier selection in a re-read order intent, with the same
 * card-format check as `selectCardRail`; a rail that lost its `card` format is not found.
 * @experimental
 */
export function findCardRail(rails: OrderIntentRail[], selection: AgentCardRail): CardCapableRail | null {
    return rails.find((rail): rail is CardCapableRail => matchesSelection(rail, selection)) ?? null;
}
