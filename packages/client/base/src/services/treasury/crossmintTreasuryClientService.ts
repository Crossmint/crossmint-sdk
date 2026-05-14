import type { CrossmintApiClient } from "@crossmint/common-sdk-base";

/**
 * Read-only client-side surface over the Crossmint Treasury REST API.
 *
 * Companion to `@crossmint/server-sdk/treasury` (which exposes the full
 * write surface and requires `sk_*` server keys). This client variant is
 * for browser / RN flows that hold a `ck_*` client key and just need to
 * poll status — e.g. an EU offramp UI that submits the create call
 * server-side, then watches `getOfframp` while the saga runs.
 *
 * Writes (createPayout, createOfframp, registerHifiOfframpAccount,
 * registerOpenPaydBeneficiary) are intentionally NOT exposed here —
 * those carry compliance + idempotency responsibilities that belong on
 * a server boundary. If a UI build needs to drive a write, do it
 * through your own server proxy that calls `@crossmint/server-sdk`.
 *
 * API version pinned to the date that landed the public Treasury surface
 * (matches `TREASURY_API_VERSION` in `@crossmint/server-sdk/treasury`).
 * When the backend bumps the dated version, add a parallel client
 * factory rather than mutating this one — consumers pin SDK versions.
 */
export const TREASURY_API_VERSION = "2026-05-11";

export interface CrossmintTreasuryClientServiceProps {
    apiClient: CrossmintApiClient;
}

// Types are loose `unknown` projections here — the client-side surface
// is just a polling read facade and consumers typically already have
// the typed shapes from `@crossmint/server-sdk/treasury` or their own
// backend response types. Keeping types minimal here avoids a wide dep
// edge from client-base to server-sdk.
export interface CrossmintTreasuryClient {
    getPayout(payoutId: string): Promise<unknown>;
    getOfframp(offrampId: string): Promise<unknown>;
    listTransactions(query?: { kind?: string; limit?: number; cursor?: string }): Promise<unknown>;
    getBalances(): Promise<unknown>;
    listAccounts(): Promise<unknown>;
}

export function createCrossmintTreasuryClient({
    apiClient,
}: CrossmintTreasuryClientServiceProps): CrossmintTreasuryClient {
    async function read<T>(path: string): Promise<T> {
        const response = await apiClient.get(path, {
            headers: { "Content-Type": "application/json" },
        });
        if (!response.ok) {
            const text = await response.text().catch(() => "");
            throw new Error(
                `Treasury API request failed: ${response.status} ${response.statusText}${text ? ` — ${text}` : ""}`
            );
        }
        return (await response.json()) as T;
    }

    return {
        async getPayout(payoutId) {
            return read(`api/${TREASURY_API_VERSION}/treasury/payouts/${encodeURIComponent(payoutId)}`);
        },
        async getOfframp(offrampId) {
            return read(`api/${TREASURY_API_VERSION}/treasury/offramps/${encodeURIComponent(offrampId)}`);
        },
        async listTransactions(query = {}) {
            const params = new URLSearchParams();
            if (query.kind != null) {
                params.set("kind", query.kind);
            }
            if (query.limit != null) {
                params.set("limit", String(query.limit));
            }
            if (query.cursor != null) {
                params.set("cursor", query.cursor);
            }
            const qs = params.toString();
            return read(`api/${TREASURY_API_VERSION}/treasury/transactions${qs ? `?${qs}` : ""}`);
        },
        async getBalances() {
            return read(`api/${TREASURY_API_VERSION}/treasury/balances`);
        },
        async listAccounts() {
            return read(`api/${TREASURY_API_VERSION}/treasury/accounts`);
        },
    };
}
