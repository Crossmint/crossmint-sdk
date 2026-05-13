/**
 * Typed error surfaced when the Treasury API returns a non-2xx response.
 * Mirrors the controller-side error shape: `{ code, message }` plus
 * optional fields per surface (e.g. idempotency-conflict surfaces the
 * original status, region/vendor restriction surfaces those values).
 *
 * Consumers should match on `code` rather than `message` — message text
 * may evolve, codes are stable.
 *
 * Common codes (non-exhaustive):
 *   - `treasury.idempotency.in_flight`     — 409, retry shortly
 *   - `treasury.idempotency.body_mismatch` — 409, same key used with different body
 *   - `treasury.payout.region_not_supported` — 400, route doesn't support payouts
 *   - `treasury.payout.context_missing`    — 404, GET-able only via the new GET wiring
 *   - `treasury.offramp.region_not_supported`
 *   - `treasury.offramp.eu_workflow_pending` — 501, EU saga apps-layer not yet wired
 *   - `treasury.offramp.context_missing`
 *   - `treasury.user.not_provisioned`       — 400, complete onboarding first
 *   - `treasury.chain.unsupported`          — 400
 */
export class CrossmintTreasuryError extends Error {
    constructor(
        message: string,
        public readonly code: string,
        public readonly status: number,
        public readonly raw: unknown
    ) {
        super(message);
        this.name = "CrossmintTreasuryError";
    }
}
