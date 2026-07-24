import { randomUUID } from "node:crypto";
import {
    type Crossmint,
    type CrossmintApiClient,
    CrossmintApiClient as CrossmintApiClientCtor,
} from "@crossmint/common-sdk-base";

import { CrossmintTreasuryError } from "./errors";
import type {
    CreateTreasuryOfframpRequest,
    CreateTreasuryPayoutRequest,
    ListTreasuryAccountsResponse,
    ListTreasuryBalancesResponse,
    ListTreasuryTransactionsQuery,
    ListTreasuryTransactionsResponse,
    RegisterOfframpAccountRequest,
    RegisterOpenPaydBeneficiaryRequest,
    RegisteredOfframpAccount,
    RegisteredOpenPaydBeneficiary,
    TreasuryOfframp,
    TreasuryPayout,
} from "./types";

/**
 * REST API version pinned to the date that landed the public Treasury
 * surface (see crossbit-main commits 6b7677265f / 482d82e4b8 / 9b2d186f29).
 * When the backend bumps to a later dated version, add a new class
 * surface (e.g. CrossmintTreasury2027) rather than mutating this one —
 * SDK consumers pin versions and a version bump on the wire is a
 * breaking change.
 */
export const TREASURY_API_VERSION = "2026-05-11";

const IDEMPOTENCY_KEY_HEADER = "Idempotency-Key";

export interface CrossmintTreasuryOptions {
    /**
     * Override the auto-generated UUID idempotency key generator. Useful for
     * tests + for callers that want to carry their own idempotency-key
     * lineage (e.g. derived from upstream request id).
     */
    idempotencyKeyFn?: () => string;
}

/**
 * Server-side SDK for the Crossmint B2B Treasury API. Region-agnostic:
 * routing to HiFi (US) vs OpenPayd (EU) happens server-side based on the
 * project's configured region. The SDK surface is uniform across
 * regions, but some operations return 501 / 400 from regions that
 * haven't lit up that flow yet — match on the `code` field of
 * `CrossmintTreasuryError` to handle.
 *
 * Auth: server keys only (`sk_*`). The Treasury surface uses
 * `TREASURY_READ` / `TREASURY_WRITE` API key scopes; passing a client
 * key (`ck_*`) will be rejected by the API.
 */
export class CrossmintTreasury {
    private readonly idempotencyKeyFn: () => string;

    private constructor(
        private readonly apiClient: CrossmintApiClient,
        options: CrossmintTreasuryOptions = {}
    ) {
        this.idempotencyKeyFn = options.idempotencyKeyFn ?? randomUUID;
    }

    public static from(crossmint: Crossmint, options: CrossmintTreasuryOptions = {}): CrossmintTreasury {
        const apiClient = new CrossmintApiClientCtor(crossmint, {
            internalConfig: {
                sdkMetadata: { name: "@crossmint/server-sdk/treasury", version: TREASURY_API_VERSION },
                apiKeyExpectations: { usageOrigin: "server" },
            },
        });
        return new CrossmintTreasury(apiClient, options);
    }

    // -----------------------------------------------------------------------
    // Payouts (R0)
    // -----------------------------------------------------------------------

    /**
     * Initiate a regulated payout to an external wallet. Idempotent on the
     * `Idempotency-Key` header — caller can replay the same key with the
     * same body to dedup; replaying with a different body returns a 409
     * `treasury.idempotency.body_mismatch`.
     */
    async createPayout(
        request: CreateTreasuryPayoutRequest,
        opts: { idempotencyKey?: string } = {}
    ): Promise<TreasuryPayout> {
        return this.write<TreasuryPayout>(`api/${TREASURY_API_VERSION}/treasury/payouts`, request, opts);
    }

    async getPayout(payoutId: string): Promise<TreasuryPayout> {
        return this.read<TreasuryPayout>(`api/${TREASURY_API_VERSION}/treasury/payouts/${encodeURIComponent(payoutId)}`);
    }

    // -----------------------------------------------------------------------
    // Offramps (R2)
    // -----------------------------------------------------------------------

    /**
     * Initiate a crypto → fiat offramp. On HiFi (US) the call is quote+accept
     * atomic. On OpenPayd (EU) the saga returns 501 `eu_workflow_pending`
     * until the apps-layer chain executor is wired (Phase 9.2-apps).
     */
    async createOfframp(
        request: CreateTreasuryOfframpRequest,
        opts: { idempotencyKey?: string } = {}
    ): Promise<TreasuryOfframp> {
        return this.write<TreasuryOfframp>(`api/${TREASURY_API_VERSION}/treasury/offramps`, request, opts);
    }

    async getOfframp(offrampId: string): Promise<TreasuryOfframp> {
        return this.read<TreasuryOfframp>(
            `api/${TREASURY_API_VERSION}/treasury/offramps/${encodeURIComponent(offrampId)}`
        );
    }

    /**
     * Register a destination bank account for HiFi offramps. Returns the
     * persisted account id; pass that id as `destinationAccountId` on
     * subsequent `createOfframp` calls.
     */
    async registerHifiOfframpAccount(request: RegisterOfframpAccountRequest): Promise<RegisteredOfframpAccount> {
        return this.write<RegisteredOfframpAccount>(
            `api/${TREASURY_API_VERSION}/treasury/offramp-accounts`,
            request
        );
    }

    /**
     * Register a destination bank account for OpenPayd offramps. EU
     * equivalent of `registerHifiOfframpAccount`. Returns the persisted
     * beneficiary id; pass that as `destinationAccountId` on
     * `createOfframp`.
     */
    async registerOpenPaydBeneficiary(
        request: RegisterOpenPaydBeneficiaryRequest
    ): Promise<RegisteredOpenPaydBeneficiary> {
        return this.write<RegisteredOpenPaydBeneficiary>(
            `api/${TREASURY_API_VERSION}/treasury/beneficiaries`,
            request
        );
    }

    // -----------------------------------------------------------------------
    // Read endpoints
    // -----------------------------------------------------------------------

    async listAccounts(): Promise<ListTreasuryAccountsResponse> {
        return this.read<ListTreasuryAccountsResponse>(`api/${TREASURY_API_VERSION}/treasury/accounts`);
    }

    async getBalances(): Promise<ListTreasuryBalancesResponse> {
        return this.read<ListTreasuryBalancesResponse>(`api/${TREASURY_API_VERSION}/treasury/balances`);
    }

    async listTransactions(
        query: ListTreasuryTransactionsQuery = {}
    ): Promise<ListTreasuryTransactionsResponse> {
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
        const path = `api/${TREASURY_API_VERSION}/treasury/transactions${qs ? `?${qs}` : ""}`;
        return this.read<ListTreasuryTransactionsResponse>(path);
    }

    // -----------------------------------------------------------------------
    // Internals
    // -----------------------------------------------------------------------

    private async write<T>(
        path: string,
        body: unknown,
        opts: { idempotencyKey?: string } = {}
    ): Promise<T> {
        const idempotencyKey = opts.idempotencyKey ?? this.idempotencyKeyFn();
        const response = await this.apiClient.post(path, {
            headers: {
                "Content-Type": "application/json",
                [IDEMPOTENCY_KEY_HEADER]: idempotencyKey,
            },
            body: JSON.stringify(body),
        });
        return this.unwrap<T>(response);
    }

    private async read<T>(path: string): Promise<T> {
        const response = await this.apiClient.get(path, {
            headers: { "Content-Type": "application/json" },
        });
        return this.unwrap<T>(response);
    }

    private async unwrap<T>(response: Response): Promise<T> {
        if (response.ok) {
            return (await response.json()) as T;
        }
        // 4xx surfaces the controller's `{ code, message, ... }` shape.
        // Read defensively — some upstream errors (e.g. nginx 502) won't
        // be JSON, in which case we fall back to a generic code.
        let parsed: unknown;
        try {
            parsed = await response.json();
        } catch {
            throw new CrossmintTreasuryError(
                `Treasury API request failed: ${response.status} ${response.statusText}`,
                "treasury.unknown_error",
                response.status,
                null
            );
        }
        const shape = parsed as { code?: unknown; message?: unknown };
        const code = typeof shape.code === "string" ? shape.code : "treasury.unknown_error";
        const message =
            typeof shape.message === "string"
                ? shape.message
                : `Treasury API request failed: ${response.status} ${response.statusText}`;
        throw new CrossmintTreasuryError(message, code, response.status, parsed);
    }
}
