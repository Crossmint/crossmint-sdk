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
 *   - `treasury.idempotency.in_flight`        — 409, retry shortly
 *   - `treasury.idempotency.body_mismatch`    — 409, same key used with different body
 *   - `treasury.payout.region_not_supported`  — 400, route doesn't support payouts
 *   - `treasury.payout.context_missing`       — 404, GET-able only via the new GET wiring
 *   - `treasury.offramp.region_not_supported` — 400
 *   - `treasury.offramp.context_missing`      — 404
 *   - `treasury.offramp.currency_unsupported` — 400, EU offramp only USDC or EURC source
 *   - `treasury.user.not_provisioned`         — 400, complete US onboarding (Phase 2.4/2.7) first
 *   - `treasury.account.not_provisioned`      — 400, complete EU provisioning (Phase 3.1) first
 *   - `treasury.account.misconfigured`        — 400, missing server env (e.g. OpenPayd parent account holder id)
 *   - `treasury.account.unavailable`          — 500, vendor returned unavailable
 *   - `treasury.chain.unsupported`            — 400
 *   - `treasury.region.unresolved`            — 400, project missing treasuryRegions and no legacy fallback
 *   - `treasury.region.invariant_violation`   — 500, server-asserted single-region rule violated
 *   - `treasury.settlement_chain.unresolved`  — 400
 *   - `treasury.route.unsupported`            — 400, (region, vendor) tuple has no adapter
 *
 * Note: `treasury.offramp.eu_workflow_pending` was removed in Phase 9.2-apps
 * — the EU saga is now live; an EU offramp returns a real `pending` envelope
 * rather than a 501. If you see it surface in older SDK versions or stale
 * environments, upgrade the backend.
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
