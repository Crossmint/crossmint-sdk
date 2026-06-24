---
"@crossmint/server-sdk": minor
---

Add `CrossmintTreasury` server-side SDK for the B2B Treasury REST surface (`2026-05-11/treasury/*`). Region-agnostic methods: `createPayout` / `getPayout`, `createOfframp` / `getOfframp`, `registerHifiOfframpAccount`, `registerOpenPaydBeneficiary`, `listAccounts`, `getBalances`, `listTransactions`. Auto-generates `Idempotency-Key` UUIDs on writes (caller can override). Server-key-only (`sk_*`) — rejects client keys at construction. Typed `CrossmintTreasuryError` with stable `code` field for status-code-based error handling.
