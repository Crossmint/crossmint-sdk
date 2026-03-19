# wallets-v1 QA Coverage Analysis

Last updated after adding server signer e2e test suite (10 suites, 34 tests).

## Test files and counts

| File | Tests | Type | SDK calls |
|------|------:|------|-----------|
| `scripts/e2e-sdk-wallets-v1.mjs` | **135** | Node.js e2e, Suites 1–23 | Real API (staging) |
| `scripts/e2e-device-signer-wallets-v1.mjs` | **44** | Node.js e2e, Suites 1–9 | Real API (staging) |
| `scripts/e2e-server-signer-wallets-v1.mjs` | **34** | Node.js e2e, Suites 1–10 | Real API (staging) |
| `CrossmintWalletBaseProvider.test.tsx` | **28** | React unit (Vitest + RTL) | Fully mocked |
| **Total** | **241** | | |

---

## Method coverage matrix

| Method | e2e-sdk (135) | e2e-device (44) | e2e-server (34) | React unit (28) | External QA | Gap |
|--------|:-------------:|:---------------:|:---------------:|:---------------:|:-----------:|-----|
| `createWallet` | ✅ EVM/SOL/XLM — shape, idempotency, error paths, deep response body | ✅ EVM/SOL + Bug #4 documented | ✅ EVM/SOL server recovery — shape, determinism, different secrets | ✅ status transitions, JWT guard, SDK separation, concurrent calls, params | ✅ email signer | — |
| `getWallet` | ✅ EVM/SOL/XLM — found wallet, not-found error, wrong recovery error, deep shape | ✅ EVM | ✅ server recovery — by address, no secret validation at retrieval (BEHAVIOR documented) | ✅ status transitions, WalletNotAvailableError handling, params forwarding | — | — |
| `addSigner` | ✅ external-wallet EVM/SOL — prepareOnly shape, idempotency, error paths, email/phone disabled | ✅ device EVM/SOL prepareOnly — signatureId/transactionId shape | ✅ server EVM/SOL prepareOnly — shape, signers() count+shape, idempotency, negative paths | ✅ email | ❌ full approve lifecycle blocked by awaiting-approval status |
| `signers()` | ✅ new shape `{ type, address, locator, status }` — count, signerIsRegistered round-trip, known prefixes, address format | ✅ device locators | ✅ server signer entry after addSigner — type/locator/address/status | ✅ | — |
| `signerIsRegistered` | ✅ true/false for all chains | ✅ comprehensive — before/after addSigner | ✅ server recovery returns false (not in delegated list), server delegated returns true after addSigner | — | — |
| `useSigner` | ✅ unregistered throws, recovery locator no-throw | — | ✅ server recovery throws ([BEHAVIOR]), string locator throws ([BUG #11]), works after addSigner, unregistered throws | — | ❌ passkey, device signer paths untested |
| `approve` | ✅ 8 negative cases: nonExistent UUID, missing fields, read-only wallet, invalid signature, unregistered signer, malformed ID | ✅ device error paths | — | ✅ prepare→approve | ❌ full lifecycle (non-prepareOnly) never tested end-to-end |
| `send` | ✅ prepareOnly error paths, invalid token, 0-value Bug #6 documented | ✅ prepareOnly | ✅ EVM/SOL prepareOnly with server delegated signer — transactionId shape, transactions() shape | ✅ full send | ❌ full signed send blocked (server awaiting-approval) |
| `balances` | ✅ deep shape — nativeToken (symbol/name/amount/decimals), usdc, tokens array, contractAddress vs mintHash per chain | — | — | ✅ | — |
| `transactions` | ✅ shape — id UUID, status enum, chainType, walletType, approvals.pending+submitted shape, signer object shape, onChain field, signatureId not in list | ✅ Solana awaiting-approval, awaiting-approval status | ✅ send prepareOnly tx appears with awaiting-approval + pending approvals referencing server signer | — | ⚠ hash/explorerLink for confirmed txs (need signed tx) |
| `transfers` | ✅ Bug #5 regression (no-params → 400), valid params, response shape, Solana | — | — | — | ❌ happy path (requires wallet with historical transfers) |
| `signMessage` | ✅ EVM — prepareOnly shape (signatureId UUID), not in transactions(), error paths, response body | — | ⚠ [BUG #10] signMessage undefined on factory-created wallets (EVMWallet subclass not returned) | — | ❌ full lifecycle — blocked by Bug #10 |
| `signTypedData` | ✅ EVM — prepareOnly shape, not in transactions(), domain validation (missing verifyingContract), missing fields | — | ⚠ [BUG #10] signTypedData undefined on factory-created wallets | — | ❌ full lifecycle |
| `needsRecovery` | ✅ returns boolean, false for external-wallet recovery | ✅ false path + after addSigner | — | — | ❌ true path — requires new-device scenario |
| `recover` | ✅ function exists, no-op when `needsRecovery()===false`, no throw | — | — | ✅ device recovery | ❌ actual recovery flow (requires `needsRecovery()===true`) |
| `createDeviceSigner` | ✅ shape, errors, unique keys per call | ✅ comprehensive — descriptor fields, locator encoding, P-256 key format | ✅ storage guard, call-through, descriptor shape | — | — |
| `createPasskeySigner` | — | — | — | ✅ exposed in context | — | ❌ actual creation never tested (browser-only) |

---

## Coverage by signer type

| Signer type | Created | Used as recovery | Added via `addSigner` | Signs tx (`approve`) | Gap |
|------------|:-------:|:----------------:|:---------------------:|:--------------------:|-----|
| `external-wallet` | ✅ all fixtures | ✅ all fixtures | ✅ EVM/SOL/XLM — shape, idempotency, error paths | ❌ no private key | Read-only fixtures — full approve blocked by design |
| `device` | ✅ descriptor shape + errors | N/A (cannot be recovery) | ✅ EVM+SOL prepareOnly + Bug #4 documented | ❌ Bug #3 — status stuck at pending | Full signing requires Bug #3 fix |
| `email` | — | — | ✅ throws clear error (V1 disables) | — | Confirmed disabled; full flow (OTP) untested |
| `phone` | — | — | ✅ throws clear error (V1 disables) | — | Confirmed disabled; OTP flow untested |
| `passkey` | — | — | ✅ throws (wrong env server-side) | — | ❌ browser-only; no e2e coverage |
| `server` | ✅ EVM/SOL createWallet — shape, determinism, recovery.type/address | ✅ EVM/SOL createWallet | — | ✅ addSigner EVM/SOL prepareOnly, useSigner after addSigner, send prepareOnly | — | ❌ full signing (server awaiting-approval can't sign); Bug #10 blocks signMessage |
| `server` | ❌ | ❌ | ❌ | ❌ | ❌ completely untested — Node.js server-key flow not covered at all |

---

## React provider coverage (`CrossmintWalletBaseProvider.test.tsx`)

All 28 tests use Vitest + React Testing Library. The wallets SDK is fully mocked — no real API calls.

| Area | Tests | What's covered |
|------|------:|----------------|
| Initialization | 4 | Initial status `'not-loaded'`, wallet `undefined`, `emailSignerState` initial shape, context method types |
| `useWallet()` hook | 3 | Default context outside provider (no throw), error message when calling outside provider, live context inside provider |
| `createWallet()` | 6 | JWT guard (no call without JWT), `'loaded'` on success, `'error'` on SDK throw, wallets-v1 `createWallet`≠`getWallet`, concurrent-call dedup, params forwarding (`chain`, `recovery`) |
| `getWallet()` | 4 | JWT guard, `'loaded'` on success, `'error'` on `WalletNotAvailableError` (wallets-v1 throws), params forwarding (`chain`, `alias`) |
| `createDeviceSigner()` | 3 | Throws when `deviceSignerKeyStorage` not provided, call-through to SDK when storage provided, descriptor shape (`type`, `locator`, `publicKey.x/y`) |
| JWT state management | 1 | Logout clears wallet: `setJwt(undefined)` → status resets to `'not-loaded'`, wallet `undefined` |
| wallets-v1 API surface | 3 | `getOrCreateWallet` removed from context, `recovery` field present / `adminSigner` absent, `createOnLogin` falls back from `getWallet` → `createWallet` on `WalletNotAvailableError` |

**React gaps:**
- No tests for `addSigner`, `approve`, `send`, `balances`, `transactions`, `signMessage`, `signTypedData` (wallet instance methods)
- `emailSignerState` handlers (`sendOtp`, `verifyOtp`, `reject`) never triggered — only null-checked
- `createPasskeySigner` context exposure tested, no behavior
- `status = 'in-progress'` only covered indirectly via concurrent-call guard
- Multi-wallet / chain-switching scenarios not tested
- `createOnLogin` only tested with `external-wallet` recovery — device signer path untested

---

## V1 API surface gotchas

| Gotcha | Tested? | Where |
|--------|:-------:|-------|
| `getOrCreateWallet` removed | ✅ | e2e Suite 1, React unit |
| `adminSigner` renamed to `recovery` | ✅ | e2e Suite 2, 10, 16, 23; React unit |
| `addDelegatedSigner` renamed to `addSigner` | ✅ | e2e Suite 21 |
| `delegatedSigners` renamed to `signers()` | ✅ | e2e Suite 21 |
| `customAuth` replaced by `setJwt` | ✅ | e2e Suite 21 |
| Email/phone cannot be added via `addSigner()` | ✅ | e2e Suite 21 (EVM + Solana) |
| `experimental_apiClient` still present — Bug #8 | ✅ documented | e2e Suite 21 |
| `signers()` shape changed — now `{ type, address, locator, status }` | ✅ | e2e Suites 16, 23 |
| `useSigner()` required before send/approve on non-device wallets | ⚠ partial | e2e Suite 9 (error path only; positive path for server-key untested) |
| Recovery signer cannot sign transactions | ❌ | |
| `useSigner()` does not carry over after `evmWallet.from()` — WAL-9427 | ❌ | |
| Solana Squads wallets cannot use device signers (Swig-only) | ❌ | |
| `useWalletEmailSigner` renamed to `useWalletOtpSigner` | ❌ | React hooks not tested |

---

## Chains coverage

| Chain | createWallet | getWallet | balances | transactions | addSigner | send | full tx lifecycle |
|-------|:------------:|:---------:|:--------:|:------------:|:---------:|:----:|:-----------------:|
| EVM (base-sepolia) | ✅ | ✅ | ✅ deep | ✅ shape | ✅ ext-wallet + device | ✅ error paths | ❌ blocked (read-only) |
| Solana | ✅ | ✅ | ✅ deep | ✅ awaiting-approval | ✅ ext-wallet + device | ✅ error paths | ❌ blocked |
| Stellar | ✅ | ✅ | ✅ deep | ✅ shape | ✅ throws (undeployed) | ✅ error paths | ❌ |
| React Native | — | — | — | — | — | — | ❌ out of scope |

---

## What the external QA tested that we don't

| External QA happy path | Our coverage |
|------------------------|-------------|
| Wallet creation via React + email signer | Mocked in React unit tests — not e2e |
| Full `send` (non-prepareOnly, signed + confirmed) | ❌ all our sends are `prepareOnly` or read-only errors |
| Full `prepare → approve` lifecycle | ❌ same reason — read-only fixtures |
| Wallet funding | ❌ not tested |
| Device recovery (`recover()`) | ❌ not automated |
| React UI rendering (OTP dialogs, signer prompts) | ❌ not tested |
| Phone/SMS OTP signer | ❌ planned by external QA |
| Privy integration | ❌ planned by external QA |
| Node.js server-key signer | ❌ completely untested by anyone |

---

## Remaining gaps (prioritised)

### P1 — Require infrastructure or signing capability
1. **Full tx lifecycle (send → approve → confirmed)** — requires a funded wallet with a signing-capable signer. Blocked by all fixtures being read-only (`external-wallet` recovery). Unblocks testing of Bug #3, `signMessage` full flow, `signTypedData` full flow.
2. **`needsRecovery() === true` path + `recover()` full flow** — requires a wallet that has lost its device signer (new-device scenario).
3. **Node.js server-key signer** — `{ type: "server", secret }` — create/get/send full flow. Completely uncovered by anyone.

### P2 — Signer scenarios
4. **`useSigner()` with server-key signer** — assert `send()` without `useSigner()` on server-key wallet gives a clear error, then assert it works after `useSigner()`.
5. **`useSigner()` does not carry over after `evmWallet.from()`** — WAL-9427: assert signer state resets.
6. **Passkey signer** — browser/React-Native only; no automated path available.

### P3 — React tests
7. **Wallet instance methods in React** — `addSigner`, `approve`, `send`, `balances`, `transactions` — all wallet instance methods are untested in React context.
8. **`emailSignerState` OTP flow** — `sendOtp`, `verifyOtp`, `reject` handlers never exercised.
9. **`createOnLogin` with device signer** — only `external-wallet` recovery path tested.

---

## Bug status

| # | Description | Severity | Found by | Status |
|---|-------------|----------|----------|--------|
| 1 | `createWallet` silently accepts invalid chain string | Medium | Our scripts | Open |
| 2 | `addSigner` invalid EVM address returned 500 | Medium | Our scripts | ✅ **Fixed** |
| 3 | Transaction status stuck at `"pending"` after on-chain confirmation | High | Manual testing | Open |
| 4 | `createWallet({ signers: [deviceDesc] })` throws `publicKey.x` format mismatch | High | Our scripts | Open |
| 5 | `wallet.transfers()` → 400 (`tokens` param required but should be optional) | High | External QA | Open |
| 6 | 0-value token transfers succeed on-chain (no SDK/API validation) | Medium | External QA | Open |
| 7 | Duplicate TEE iframe on `addSigner` for already-registered signer | Low/Medium | External QA | ✅ **Fixed** (commit `e60df988`) |
| 8 | `experimental_apiClient` still on wallet prototype (V1 requires removal) | Low | Our scripts | Open |
| 9 | `wallet.walletType` is `undefined` — SDK does not expose the field | Low | Our scripts | Open |
| 10 | `WalletFactory` returns base `Wallet` — `signMessage`/`signTypedData` inaccessible | High | Server signer scripts | Open |
| 11 | `useSigner("server:0x...")` string locator throws "Unknown signer type: server" | Medium | Server signer scripts | Open |

---

## Summary counts

| | e2e-sdk | e2e-device | e2e-server | React unit | External QA | Combined |
|-|:-------:|:----------:|:----------:|:----------:|:-----------:|:--------:|
| Total tests | 135 | 44 | 34 | 28 | ~12 | **241 automated** |
| Methods with ≥1 test | 17 | 10 | 10 | 5 | ~8 | **17** (all methods) |
| Signer types with any coverage | 5 (ext-wallet, device, email-disabled, phone-disabled, passkey-error) | 2 (ext-wallet, device) | 1 (server — all behaviors) | 2 (ext-wallet, device-mocked) | 2 (email, device) | **6 of 6** |
| Chains with any coverage | EVM + Solana + Stellar | EVM + Solana | EVM + Solana | EVM (mocked) | EVM | **EVM + Solana + Stellar** |
| Bugs found | 7 (our scripts + ext QA) | 1 (Bug #4) | 2 (#10, #11) + 2 behaviors documented | — | 3 | **11 total** |
| Bugs fixed (confirmed by tests) | 2 (#2, #7) | — | — | — | — | **2 fixed, 9 open** |
