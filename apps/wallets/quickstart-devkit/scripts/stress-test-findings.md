# Stress Test Findings
Run date: 2026-03-16 (updated 2026-03-17 after Solana + Stellar chain coverage added; re-run 2026-03-17 after server-side fixes merged; re-run 2026-03-24 after Bug 10 fixed — Solana signer registration now enabled, exposing 3 new 500s)
Results: 294/303 passed | 9 failing | Bugs 2–5 and 10 confirmed FIXED | 18 total findings

---

## Category A — API Bugs (server-side issues)

### Bug 1 — `POST /wallets` accepts missing `type` field (defaults silently)
- **Test:** missing wallet type → expected 400
- **Got:** 201 — wallet created with `"type": "smart"` as default
- **Endpoint:** `POST /api/2025-06-09/wallets`
- **Payload:** `{ "chainType": "evm", "config": { "adminSigner": {...} }, "owner": "..." }` (no `type`)
- **Issue:** The `type` field is silently defaulted to `"smart"` instead of being validated as required. If `type` is optional (has a default), the docs/schema should reflect that. If it is required, the API should return 400.

**Reproduce:**
```bash
curl -s -w "\nHTTP %{http_code}" \
  -H "x-api-key: $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "chainType": "evm",
    "config": { "adminSigner": { "type": "external-wallet", "address": "0x05a29d789231c290de91cc62e6dbf220894a7a6c" } },
    "owner": "userId:bug1-missing-type"
  }' \
  https://staging.crossmint.com/api/2025-06-09/wallets
# Expected: 400. Actual: 201 with "type":"smart" silently defaulted.
```

---

### Bug 2 — `POST /wallets/{addr}/signers` accepts empty string for `publicKey.x` ✅ FIXED (2026-03-17)
- **Fixed by:** WAL-9388 / commit `f1fa9dc32` — P-256 coordinate validation added to v2025 DeviceSignerInput schema
- **Test:** `publicKey.x` as empty string → expected 400
- **Was:** 201 — signer created with `"x": ""`
- **Endpoint:** `POST /api/2025-06-09/wallets/{address}/signers`
- **Payload:** `{ "signer": { "type": "device", "publicKey": { "x": "", "y": "<valid>" } }, "chain": "base-sepolia" }`
- **Response locator:** `device:BAAAAAAAAAAAAAAAAAAAAAAAAA...` (x treated as 0)
- **Issue:** Empty string is not a valid P-256 coordinate. The API should reject this with 400. Accepting it may create a signer with a degenerate/unusable public key.

**Reproduce:**
```bash
# WALLET = any existing EVM smart wallet address
curl -s -w "\nHTTP %{http_code}" \
  -H "x-api-key: $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "signer": {
      "type": "device",
      "publicKey": {
        "x": "",
        "y": "23147204147935157288319969758518109704787676547916271922675918379797265028878"
      }
    },
    "chain": "base-sepolia"
  }' \
  https://staging.crossmint.com/api/2025-06-09/wallets/$WALLET/signers
# Expected: 400. Actual: 201 — signer created with x="" (degenerate key).
```

---

### Bug 3 — `POST /wallets/{addr}/signers` returns 500 for non-numeric `publicKey.x` ✅ FIXED (2026-03-17)
- **Fixed by:** WAL-9389 / commits `f1fa9dc32` (P-256 schema validation) + `daa9cf8cfe` (catch TypeError from Zod refinements → 400)
- **Test:** `publicKey.x` as non-numeric string → expected 400
- **Was:** 500 `{"statusCode":500,"message":"Internal server error"}`
- **Endpoint:** `POST /api/2025-06-09/wallets/{address}/signers`
- **Payload:** `{ "signer": { "type": "device", "publicKey": { "x": "not-a-number", "y": "<valid>" } }, "chain": "base-sepolia" }`
- **Issue:** Unhandled exception when trying to parse a non-numeric string as a P-256 coordinate. Input validation must happen before math operations. This is a **500 regression**.

**Reproduce:**
```bash
curl -s -w "\nHTTP %{http_code}" \
  -H "x-api-key: $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "signer": {
      "type": "device",
      "publicKey": {
        "x": "not-a-number",
        "y": "23147204147935157288319969758518109704787676547916271922675918379797265028878"
      }
    },
    "chain": "base-sepolia"
  }' \
  https://staging.crossmint.com/api/2025-06-09/wallets/$WALLET/signers
# Expected: 400. Actual: 500 {"statusCode":500,"message":"Internal server error"}
```

---

### Bug 4 — `POST /wallets/{addr}/signers` returns 500 for negative `publicKey.x` ✅ FIXED (2026-03-17)
- **Fixed by:** WAL-9390 / commit `f1fa9dc32` — field-level `.refine` on x/y rejects negative values before BigInt conversion
- **Test:** `publicKey.x` as negative number (`"-1"`) → expected 400
- **Was:** 500 `{"statusCode":500,"message":"Internal server error"}`
- **Endpoint:** `POST /api/2025-06-09/wallets/{address}/signers`
- **Payload:** `{ "signer": { "type": "device", "publicKey": { "x": "-1", "y": "<valid>" } }, "chain": "base-sepolia" }`
- **Issue:** Negative coordinates are not valid in P-256. Same unhandled exception as Bug 3. The signer registration handler needs to validate that x and y are positive integers before processing.

**Reproduce:**
```bash
curl -s -w "\nHTTP %{http_code}" \
  -H "x-api-key: $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "signer": {
      "type": "device",
      "publicKey": {
        "x": "-1",
        "y": "23147204147935157288319969758518109704787676547916271922675918379797265028878"
      }
    },
    "chain": "base-sepolia"
  }' \
  https://staging.crossmint.com/api/2025-06-09/wallets/$WALLET/signers
# Expected: 400. Actual: 500 {"statusCode":500,"message":"Internal server error"}
```

---

### Bug 5 — `POST /wallets/{addr}/signers` returns 500 for oversized `publicKey.x` ✅ FIXED (2026-03-17)
- **Fixed by:** WAL-9385 / commit `f1fa9dc32` — field-level validation against `P256_P` prime rejects values exceeding the field range
- **Test:** `publicKey.x` larger than P-256 prime (79+ decimal digits) → expected 400
- **Was:** 500 `{"statusCode":500,"message":"Internal server error"}`
- **Endpoint:** `POST /api/2025-06-09/wallets/{address}/signers`
- **Payload:** `{ "signer": { "type": "device", "publicKey": { "x": "1" + "0".repeat(78), "y": "<valid>" } }, "chain": "base-sepolia" }`
- **Issue:** Same root cause as Bugs 3 and 4. All three cases (non-numeric, negative, oversize) crash the server with an unhandled exception. A single guard that validates x and y as non-negative integers within `[1, p-1]` where `p` is the P-256 prime would fix all three.

**Reproduce:**
```bash
# The value below (10^78) has 79 decimal digits — larger than the P-256 prime (77 digits)
curl -s -w "\nHTTP %{http_code}" \
  -H "x-api-key: $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "signer": {
      "type": "device",
      "publicKey": {
        "x": "100000000000000000000000000000000000000000000000000000000000000000000000000000",
        "y": "23147204147935157288319969758518109704787676547916271922675918379797265028878"
      }
    },
    "chain": "base-sepolia"
  }' \
  https://staging.crossmint.com/api/2025-06-09/wallets/$WALLET/signers
# Expected: 400. Actual: 500 {"statusCode":500,"message":"Internal server error"}
```

---

## Category B — API Validation Ordering Bug

### Bug 6 — Body validation runs before resource existence check (400 masks 404)

Affects two endpoints:
- `POST /wallets/{address}/tokens/{token}/transfers`
- `POST /wallets/{address}/transactions/{id}/approvals`

**Observed behavior:**
When the wallet/transaction does not exist AND the request body contains an invalid `signer` field, the API returns `400` (body validation error) instead of `404` (resource not found).

| Endpoint | Wallet exists? | Signer valid? | Got | Expected |
|----------|---------------|---------------|-----|----------|
| POST transfers | No | No (bad base64) | 400 | 404 |
| POST tx approvals | No | No (bad base64) | 400 | 404 |
| POST transfers | No | Yes (real key) | 404 | 404 ✓ |
| POST tx approvals | No | Yes (real key) | 404 | 404 ✓ |

**Why it matters:**
The correct REST order is: authenticate → check resource existence → validate body.
When these are reversed, callers receive misleading errors. A developer calling a wrong wallet address with a perfectly valid signer will get `400 "Invalid public key"` — pointing them at the wrong problem (the signer) when the real issue is the wallet address.

**Confirmed with tests fixed to use a valid-format signer locator:** after the fix both tests pass (404), proving the API does know how to return 404 — it just resolves body validation first.

**Reproduce — transfers (shows the bug):**
```bash
# Wallet does not exist + signer has invalid base64 → gets 400 instead of 404
curl -s -w "\nHTTP %{http_code}" \
  -H "x-api-key: $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "recipient": "0xc9b888e8f2c9c60f72f84e97e4416c3aca3e1f7c",
    "signer": "device:AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA==",
    "amount": "0.0001"
  }' \
  "https://staging.crossmint.com/api/2025-06-09/wallets/0x000000000000000000000000000000000000dead/tokens/base-sepolia:usdxm/transfers"
# Expected: 404 (wallet not found). Actual: 400 "Invalid public key base64"

# Same wallet + valid-format signer → correctly returns 404
curl -s -w "\nHTTP %{http_code}" \
  -H "x-api-key: $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "recipient": "0xc9b888e8f2c9c60f72f84e97e4416c3aca3e1f7c",
    "signer": "device:BGtakK8JAHvwAVdv2ssUhsbOPnG0l7vCra4htp4NJc4BMyzab/emh3h6aKoL6TwPWwTd3oQXuoASZFqRf8jMlw4=",
    "amount": "0.0001"
  }' \
  "https://staging.crossmint.com/api/2025-06-09/wallets/0x000000000000000000000000000000000000dead/tokens/base-sepolia:usdxm/transfers"
# Returns: 404 ✓ — proves the issue is validation ordering, not the 404 path itself
```

**Reproduce — transaction approvals (shows the bug):**
```bash
# Transaction does not exist + signer has invalid base64 → gets 400 instead of 404
curl -s -w "\nHTTP %{http_code}" \
  -H "x-api-key: $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "approvals": [{
      "signer": "device:AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA==",
      "signature": {
        "r": "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
        "s": "0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb"
      }
    }]
  }' \
  "https://staging.crossmint.com/api/2025-06-09/wallets/0x000000000000000000000000000000000000dead/transactions/00000000-0000-0000-0000-000000000001/approvals"
# Expected: 404 (transaction not found). Actual: 400 "Invalid public key base64"

# Same transaction + valid-format signer → correctly returns 404
curl -s -w "\nHTTP %{http_code}" \
  -H "x-api-key: $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "approvals": [{
      "signer": "device:BGtakK8JAHvwAVdv2ssUhsbOPnG0l7vCra4htp4NJc4BMyzab/emh3h6aKoL6TwPWwTd3oQXuoASZFqRf8jMlw4=",
      "signature": {
        "r": "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
        "s": "0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb"
      }
    }]
  }' \
  "https://staging.crossmint.com/api/2025-06-09/wallets/0x000000000000000000000000000000000000dead/transactions/00000000-0000-0000-0000-000000000001/approvals"
# Returns: 404 ✓ — proves the issue is validation ordering, not the 404 path itself
```

---

## Summary Table

| # | Chain | Endpoint | Input | Expected | Got | Type | Status |
|---|-------|----------|-------|----------|-----|------|--------|
| 1 | EVM | POST /wallets | missing `type` | 400 | 201 | API: silent default | ❌ Open |
| 2 | EVM | POST /wallets/{addr}/signers | `publicKey.x = ""` | 400 | 201 | API: no validation | ✅ Fixed WAL-9388 |
| 3 | EVM | POST /wallets/{addr}/signers | `publicKey.x = "not-a-number"` | 400 | **500** | API: unhandled exception | ✅ Fixed WAL-9389 |
| 4 | EVM | POST /wallets/{addr}/signers | `publicKey.x = "-1"` | 400 | **500** | API: unhandled exception | ✅ Fixed WAL-9390 |
| 5 | EVM | POST /wallets/{addr}/signers | `publicKey.x` > P-256 prime | 400 | **500** | API: unhandled exception | ✅ Fixed WAL-9385 |
| 6 | EVM | POST /wallets/{addr}/tokens/{t}/transfers | non-existent wallet + invalid signer | 404 | 400 | API: validation order (body before 404) | ❌ Open |
| 7 | EVM | POST /wallets/{addr}/transactions/{id}/approvals | non-existent tx + invalid signer | 404 | 400 | API: validation order (body before 404) | ❌ Open |
| 8 | Any | POST /wallets | `x-idempotency-key` header + `owner` field | reject one or accept both | 400 | API: undocumented mutual exclusivity | ❌ Open |
| 9 | Solana | POST /wallets | missing `type` | 400 | 201 | API: silent default (same root as Bug 1) | ❌ Open |
| 10 | Solana | POST /wallets/{addr}/signers | `chain: "solana"` | 400 | 400 "unsupported chain" | API: delegated signers not supported on Solana staging | ✅ Fixed 2026-03-24 |
| 11 | Solana | POST /wallets/{addr}/tokens/{t}/transfers | missing `signer` field | 400 | **422** | API: skips signer validation, attempts simulation | ❌ Open |
| 12 | Stellar | POST /wallets | missing `type` | 400 | 201 | API: silent default (same root as Bug 1, confirmed on Stellar) | ❌ Open |
| 13 | Stellar | POST /wallets/{addr}/signers | EVM-style object body sent to Stellar wallet | works | 400 (no schema hint) | API: undocumented chain-specific body format change | ❌ Open |
| 14 | Stellar | POST /wallets/{addr}/tokens/{t}/transfers | missing `signer` | 400 (like EVM) | 201 (uses admin signer) | API: undocumented cross-chain behavioral inconsistency | ❌ Open |
| 15 | Solana/Stellar | POST /wallets | off-curve ed25519 key as admin signer | 400 "invalid key" | 400 "smart wallet address cannot be admin" | API: misleading error message hides the real cause | ❌ Open |
| 16 | Solana | POST /wallets/{addr}/signers | `signer.address = ""` (empty string) | 400 | **500** | API: unhandled exception — no guard before address parsing | ❌ Open |
| 17 | Solana | POST /wallets/{addr}/signers | `signer.address` in EVM format (`0x...`) | 400 | **500** | API: unhandled exception — no format check before address parsing | ❌ Open |
| 18 | Solana | POST /wallets/{addr}/signers | `signer.address` too short (`"abc"`) | 400 | **500** | API: unhandled exception — no length/format check before address parsing | ❌ Open |

---

## Category C — Undocumented API Constraint

### Bug 8 — `POST /wallets` rejects `x-idempotency-key` when `owner` is also provided
- **Test:** send `x-idempotency-key` header alongside the `owner` field → expected the key to be accepted (or ignored)
- **Got:** 400 `{"error":true,"message":"Cannot provide both idempotency key and owner. The owner field already guarantees idempotency."}`
- **Endpoint:** `POST /api/2025-06-09/wallets`
- **Issue:** The API enforces mutual exclusivity between `x-idempotency-key` and `owner`, but this constraint is not documented. A developer who adds idempotency key headers (standard practice for POST requests) will get an unexpected 400 if their wallet creation request also includes an `owner` field. Since `owner` is effectively required for wallet creation in most flows, the `x-idempotency-key` header is silently unusable for this endpoint.

**Reproduce:**
```bash
curl -s -w "\nHTTP %{http_code}" \
  -H "x-api-key: $API_KEY" \
  -H "Content-Type: application/json" \
  -H "x-idempotency-key: my-unique-key-123" \
  -d '{
    "chainType": "evm",
    "type": "smart",
    "config": { "adminSigner": { "type": "external-wallet", "address": "0x05a29d789231c290de91cc62e6dbf220894a7a6c" } },
    "owner": "userId:some-user"
  }' \
  https://staging.crossmint.com/api/2025-06-09/wallets
# Expected: 201 (key accepted alongside owner, or ignored).
# Actual:   400 {"error":true,"message":"Cannot provide both idempotency key and owner. The owner field already guarantees idempotency."}
```

**Note:** The `x-idempotency-key` header works correctly on other endpoints (e.g. `POST /wallets/{addr}/signers`) where `owner` is not present.

---

---

## Category D — Solana-Specific Findings

### Bug 9 — `POST /wallets` with `chainType: "solana"` silently defaults missing `type` to `"smart"`
- **Same root cause as Bug 1** — confirmed to affect Solana in addition to EVM
- **Test:** `{ "chainType": "solana", "config": {...} }` (no `type`) → expected 400
- **Got:** 201 — wallet created with `"type": "smart"` defaulted silently

**Reproduce:**
```bash
curl -s -w "\nHTTP %{http_code}" \
  -H "x-api-key: $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "chainType": "solana",
    "config": { "adminSigner": { "type": "external-wallet", "address": "<valid-solana-address>" } },
    "owner": "userId:bug9-solana-missing-type"
  }' \
  https://staging.crossmint.com/api/2025-06-09/wallets
# Expected: 400. Actual: 201 with "type":"smart" silently defaulted.
```

---

### Bug 10 — `POST /wallets/{addr}/signers` does not support Solana chains on staging
- **Endpoint:** `POST /api/2025-06-09/wallets/{solana-address}/signers`
- **Payload:** `{ "signer": { "type": "external-wallet", "address": "<valid-solana-address>" }, "chain": "solana" }`
- **Got:** 400 `{"error":true,"message":"chain: Smart Wallets are not supported in Staging on chain 'solana'. Supported chains are: abstract-testnet, arbitrum-sepolia, ..."}`
- **Issue:** The delegated signer registration endpoint only accepts EVM chains. Solana smart wallets cannot have additional delegated signers added via this endpoint in the staging environment. This is either a product limitation (to document) or a missing feature for Solana.
- **Note:** Sending no `chain` field also fails with "chain: Smart Wallets are not supported in Staging on chain 'undefined'", so there is no valid chain value for this endpoint on Solana.

**Reproduce:**
```bash
curl -s -w "\nHTTP %{http_code}" \
  -H "x-api-key: $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "signer": { "type": "external-wallet", "address": "<valid-solana-address>" },
    "chain": "solana"
  }' \
  https://staging.crossmint.com/api/2025-06-09/wallets/$SOLANA_WALLET/signers
# Expected: 200/201 (signer added) or documented 400 if feature is not supported.
# Actual:   400 {"error":true,"message":"chain: Smart Wallets are not supported in Staging on chain 'solana'..."}
```

---

### Bug 11 — `POST /wallets/{addr}/tokens/{token}/transfers` on Solana returns 422 for missing `signer` instead of 400
- **Endpoint:** `POST /api/2025-06-09/wallets/{solana-address}/tokens/solana:sol/transfers`
- **Payload:** `{ "recipient": "<valid>", "amount": "0.0001" }` (no `signer` field)
- **Got:** 422 `{"error":true,"message":"Transaction simulation failed. Please check the transaction payload.","code":"TRANSACTION_SIMULATION_FAILED",...}`
- **Issue:** The Solana transfer endpoint does not validate that `signer` is a required field. Instead it proceeds to transaction building and simulation with no signer, which fails at the simulation stage with a 422. The EVM endpoint correctly returns 400 for missing `signer`. This is a validation ordering issue where Solana's transfer handler skips body field validation and goes straight to on-chain simulation.
- **Impact:** When a developer omits the `signer` field for a Solana transfer, they receive a confusing "Transaction simulation failed" error that points to the transaction payload rather than the missing required field.

**Reproduce:**
```bash
SOLANA_WALLET=<valid-solana-smart-wallet-address>
curl -s -w "\nHTTP %{http_code}" \
  -H "x-api-key: $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "recipient": "11111111111111111111111111111111",
    "amount": "0.0001"
  }' \
  https://staging.crossmint.com/api/2025-06-09/wallets/$SOLANA_WALLET/tokens/solana:sol/transfers
# Expected: 400 "signer is required"
# Actual:   422 "Transaction simulation failed"
```

---

### Bug 12 — `POST /wallets` with `chainType: "stellar"` silently defaults missing `type` to `"smart"`
- **Same root cause as Bugs 1 and 9** — confirmed to affect all three chain types (EVM, Solana, Stellar)
- **Test:** `{ "chainType": "stellar", "config": {...} }` (no `type`) → expected 400
- **Got:** 201 — wallet created with `"type": "smart"` defaulted silently

**Reproduce:**
```bash
curl -s -w "\nHTTP %{http_code}" \
  -H "x-api-key: $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "chainType": "stellar",
    "config": { "adminSigner": { "type": "external-wallet", "address": "<valid-stellar-G-address>" } },
    "owner": "userId:bug12-stellar-missing-type"
  }' \
  https://staging.crossmint.com/api/2025-06-09/wallets
# Expected: 400. Actual: 201 with "type":"smart" silently defaulted.
```

---

### Bug 13 — `POST /wallets/{addr}/signers` uses a different body schema for Stellar vs EVM/Solana (undocumented)
- **Endpoint:** `POST /api/2025-06-09/wallets/{address}/signers`
- **EVM/Solana body:** `{ "signer": { "type": "device|external-wallet", "publicKey/address": "..." }, "chain": "base-sepolia|solana" }`
- **Stellar body:** `{ "signer": "external-wallet:GA7QYNF7..." }` — a **locator string**, no `chain` field
- Sending the EVM/Solana object format `{ signer: { type: "...", address: "..." } }` to a Stellar wallet returns 400.
- Sending the Stellar locator string format to an EVM wallet also returns 400.
- **Issue:** The body schema for the same endpoint differs fundamentally between chains. This is undocumented — the API reference shows only one format. A developer migrating from EVM to Stellar will write a body that fails silently with a generic 400, with no indication that the schema itself must change.
- Stellar also requires the wallet to be **deployed on-chain** before signers can be added (400: "has not been deployed on-chain yet"). New wallets from `POST /wallets` are not deployed until their first transaction.

**Reproduce — correct Stellar locator format (works):**
```bash
curl -s -w "\nHTTP %{http_code}" \
  -H "x-api-key: $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{ "signer": "external-wallet:GA7QYNF7SOWQ3GLR2BGMZEHXR4HXNLJ5MVKZUKVR7PQYOMTCJ7QJOSUL" }' \
  https://staging.crossmint.com/api/2025-06-09/wallets/$STELLAR_WALLET/signers
# Works — locator string accepted

# Same endpoint with EVM-style object body → fails with 400 (no hint about format difference)
curl -s -w "\nHTTP %{http_code}" \
  -H "x-api-key: $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{ "signer": { "type": "external-wallet", "address": "GA7QYNF7..." }, "chain": "stellar" }' \
  https://staging.crossmint.com/api/2025-06-09/wallets/$STELLAR_WALLET/signers
# Expected: helpful 400 "Stellar wallets use locator string format". Actual: generic 400
```

---

### Bug 14 — `POST /wallets/{addr}/tokens/{t}/transfers` signer field is optional on Stellar but required on EVM/Solana (undocumented cross-chain inconsistency)
- **Endpoint:** `POST /api/2025-06-09/wallets/{address}/tokens/{token}/transfers`
- **EVM behavior:** omitting `signer` → 400 "signer is required"
- **Solana behavior:** omitting `signer` → 422 "Transaction simulation failed" (Bug 11)
- **Stellar behavior:** omitting `signer` → 201/202 — the API proceeds using the wallet's admin signer
- **Issue:** The `signer` field is a required field in EVM and Solana but silently optional in Stellar. This is not documented anywhere. A developer building a multi-chain application who relies on omitting `signer` for Stellar will have broken EVM/Solana code, and vice-versa. Either the field should be consistently required (and documented as optional with a default for Stellar), or the Stellar behavior should be documented explicitly.
- **Note:** Even on Stellar, `signer: null` and `signer: ""` return 400 — the optionality only applies to the field being absent from the body entirely.

**Reproduce:**
```bash
# EVM — missing signer → 400 (required)
curl -s -w "\nHTTP %{http_code}" \
  -H "x-api-key: $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{ "recipient": "0xc9b888e8f2c9c60f72f84e97e4416c3aca3e1f7c", "amount": "0.0001" }' \
  https://staging.crossmint.com/api/2025-06-09/wallets/$EVM_WALLET/tokens/base-sepolia:eth/transfers
# Returns: 400 — "signer is required"

# Stellar — missing signer → 201 (optional, uses admin signer)
curl -s -w "\nHTTP %{http_code}" \
  -H "x-api-key: $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{ "recipient": "'$STELLAR_WALLET'", "amount": "0.0001" }' \
  https://staging.crossmint.com/api/2025-06-09/wallets/$STELLAR_WALLET/tokens/stellar:xlm/transfers
# Returns: 201 — proceeds with admin signer (undocumented)
```

---

### Bug 15 — Misleading error message when admin signer is an off-curve ed25519 point (Solana and Stellar)
- **Endpoints:** `POST /api/2025-06-09/wallets` (all chain types)
- **EVM config:** `{ "chainType": "solana", "config": { "adminSigner": { "type": "external-wallet", "address": "<off-curve-32-bytes-as-base58>" } } }`
- **Got:** 400 `"Solana smart wallets addresses cannot be used as admin signers"`
- **Issue:** The error message says "Solana smart wallets addresses cannot be used as admin signers" — implying the error is about the signer being a smart wallet address — when the actual cause is that the 32-byte public key is not a valid point on the ed25519 elliptic curve. Off-curve points are the same bit-pattern as PDAs/program addresses in Solana's address space.
- **Impact:** ~50% of naively-generated random 32-byte sequences will be off-curve, making this error appear intermittently with no clear diagnosis path. The error message does not hint that the caller should use a real ed25519 keypair. The same constraint applies to Stellar (G... addresses must encode an on-curve ed25519 key).
- **Fix:** Change the error to: `"adminSigner.address must be a valid ed25519 public key (on-curve point). Use a real keypair, not a random byte sequence."` And document the constraint in the API reference.

**Reproduce:**
```bash
# off-curve address: 11111111111111111111111111111111 is the Solana System Program (off-curve)
curl -s -w "\nHTTP %{http_code}" \
  -H "x-api-key: $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "chainType": "solana",
    "type": "smart",
    "config": { "adminSigner": { "type": "external-wallet", "address": "11111111111111111111111111111111" } },
    "owner": "userId:bug15-offcurve"
  }' \
  https://staging.crossmint.com/api/2025-06-09/wallets
# Got: 400 "Solana smart wallets addresses cannot be used as admin signers"
# Misleading: the real issue is the address is off the ed25519 curve, not that it's a "smart wallet"
```

---

---

## Category E — New Solana Signer Registration 500s (found 2026-03-24 after Bug 10 fixed)

These three bugs were hidden behind Bug 10 (Solana signer registration returned 400 "unsupported chain" for all inputs). Once Bug 10 was fixed and the endpoint started accepting Solana signer registrations, invalid address inputs began reaching unguarded parsing code and crashing the server. They share the same root cause as EVM Bugs 3/4/5 — no input validation before the address is processed.

All three were confirmed with a live Solana wallet (`9YTo2x9y5sorqo8XnsJnbZ6VXpjoKVos95NBSvYM6MMg`) on staging on 2026-03-24.

---

### Bug 16 — `POST /wallets/{addr}/signers` returns 500 for empty string `signer.address` (Solana)
- **Test:** `signer.address = ""` → expected 400
- **Got:** 500 `{"statusCode":500,"message":"Internal server error"}`
- **Endpoint:** `POST /api/2025-06-09/wallets/{solana-address}/signers`
- **Payload:** `{ "signer": { "type": "external-wallet", "address": "" }, "chain": "solana" }`
- **Issue:** An empty string is not a valid base58 Solana address. The server should reject it with 400 before attempting any address parsing or on-chain operations. Instead, the empty string reaches internal parsing code and causes an unhandled exception.

**Reproduce:**
```bash
SOLANA_WALLET=<valid-solana-smart-wallet-address>

curl -s -w "\nHTTP %{http_code}" \
  -H "x-api-key: $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "signer": { "type": "external-wallet", "address": "" },
    "chain": "solana"
  }' \
  "https://staging.crossmint.com/api/2025-06-09/wallets/$SOLANA_WALLET/signers"
# Expected: 400 "signer.address is required" or "signer.address must be a valid Solana address"
# Actual:   500 {"statusCode":500,"message":"Internal server error"}
```

---

### Bug 17 — `POST /wallets/{addr}/signers` returns 500 for EVM-format address on Solana wallet
- **Test:** `signer.address` set to an EVM hex address (`0x...`) → expected 400
- **Got:** 500 `{"statusCode":500,"message":"Internal server error"}`
- **Endpoint:** `POST /api/2025-06-09/wallets/{solana-address}/signers`
- **Payload:** `{ "signer": { "type": "external-wallet", "address": "0x000000000000000000000000000000000000dead" }, "chain": "solana" }`
- **Issue:** An `0x`-prefixed hex address is not valid base58 and is not a Solana address. The server should detect the wrong format and return 400. Instead, it crashes with an unhandled exception. This is likely to happen in practice when a developer accidentally passes an EVM address to a Solana endpoint.

**Reproduce:**
```bash
SOLANA_WALLET=<valid-solana-smart-wallet-address>

curl -s -w "\nHTTP %{http_code}" \
  -H "x-api-key: $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "signer": { "type": "external-wallet", "address": "0x000000000000000000000000000000000000dead" },
    "chain": "solana"
  }' \
  "https://staging.crossmint.com/api/2025-06-09/wallets/$SOLANA_WALLET/signers"
# Expected: 400 "signer.address must be a valid Solana base58 address"
# Actual:   500 {"statusCode":500,"message":"Internal server error"}
```

---

### Bug 18 — `POST /wallets/{addr}/signers` returns 500 for a too-short `signer.address` on Solana wallet
- **Test:** `signer.address = "abc"` (3 chars, not a valid base58 public key) → expected 400
- **Got:** 500 `{"statusCode":500,"message":"Internal server error"}`
- **Endpoint:** `POST /api/2025-06-09/wallets/{solana-address}/signers`
- **Payload:** `{ "signer": { "type": "external-wallet", "address": "abc" }, "chain": "solana" }`
- **Issue:** A 3-character string is far too short to be a valid Solana address (valid base58 public keys are 32–44 characters). No length or format check is performed before the address is passed to the parsing/validation layer, causing a server crash.

**Reproduce:**
```bash
SOLANA_WALLET=<valid-solana-smart-wallet-address>

curl -s -w "\nHTTP %{http_code}" \
  -H "x-api-key: $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "signer": { "type": "external-wallet", "address": "abc" },
    "chain": "solana"
  }' \
  "https://staging.crossmint.com/api/2025-06-09/wallets/$SOLANA_WALLET/signers"
# Expected: 400 "signer.address must be a valid Solana base58 address (32–44 characters)"
# Actual:   500 {"statusCode":500,"message":"Internal server error"}
```

**Note:** Bugs 16, 17, and 18 share the same root cause — the Solana signer registration handler lacks a guard that validates `signer.address` as a valid base58 Solana public key before proceeding. A single Zod/schema-level `.refine()` that checks the address is a non-empty, correctly-formatted base58 string of valid length would fix all three. This is the same pattern as EVM Bugs 3/4/5, which were fixed in WAL-9389/9390.

---

## Recommended API Fixes

### Signer registration — add input guards before P-256 math
```
if (!publicKey.x || !publicKey.y) → 400 "publicKey.x and publicKey.y are required"
if (!/^\d+$/.test(publicKey.x)) → 400 "publicKey.x must be a non-negative integer"
if (!/^\d+$/.test(publicKey.y)) → 400 "publicKey.y must be a non-negative integer"
if (BigInt(publicKey.x) >= P256_PRIME) → 400 "publicKey.x is out of P-256 field range"
if (BigInt(publicKey.y) >= P256_PRIME) → 400 "publicKey.y is out of P-256 field range"
// Also validate the point is on the curve
```

### Wallet creation — clarify if `type` is required or optional
- If optional with default `"smart"`: document it and update schema
- If required: add validation to reject missing `type` with a clear 400 error

### Validation ordering — check resource existence before validating body
```
// Current (wrong order):
1. Validate request body (signer format, amounts, etc.)
2. Check wallet/transaction exists

// Correct order:
1. Authenticate (401/403)
2. Check resource existence (404)
3. Validate request body (400)
```
Affected endpoints:
- `POST /wallets/{address}/tokens/{token}/transfers`
- `POST /wallets/{address}/transactions/{id}/approvals`

### Solana transfers — validate `signer` as required before simulation
- Add input validation for `signer` field on `POST /transfers` for Solana wallets (same as EVM already does)
- Should return 400 "signer is required" instead of proceeding to simulation and returning 422

### Solana signer registration — document chain support status
- Either document that `POST /wallets/{addr}/signers` does not support Solana chains, or implement it
- If not supported: the API should return a clear 400 with message "Solana wallets do not support delegated signer registration" rather than the generic "chain not supported on staging" message

### Stellar signer registration — document or normalize the body schema
- Either update the API docs to show that `/wallets/{addr}/signers` accepts chain-specific formats, or normalize to a single format. If the locator string format is intentional for Stellar, provide a clear error message when EVM/Solana-style bodies are sent to Stellar wallets: `"Stellar wallets use locator string format: { signer: \"external-wallet:<G-address>\" }"`.

### Transfer signer field — document optionality per chain
- If `signer` is intentionally optional for Stellar (using admin signer as default), document this explicitly in the API reference. Add the same optional-with-default behavior note for EVM/Solana if that's the intended direction, or keep `signer` required everywhere with clear docs.

### Misleading off-curve key error — improve error message
- Change `"Solana smart wallets addresses cannot be used as admin signers"` to `"adminSigner.address must be a valid ed25519 public key. Ensure you are using a real keypair, not a random byte sequence or program address."`. Document the on-curve requirement in the API reference.

### Idempotency key + owner constraint — document or reconsider
- The mutual exclusivity of `x-idempotency-key` and `owner` is undocumented. Either:
  - **Document it** clearly in the API reference so developers know `x-idempotency-key` is only for ownerless wallet creation flows
  - **Or accept both**, ignoring the header when `owner` is present (since the `owner` field already provides idempotency)
