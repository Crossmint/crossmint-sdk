# wallets-v1 — Bug Findings

Bugs discovered during SDK-level e2e testing on the `wallets-v1` branch.
Tests live in `apps/wallets/quickstart-devkit/scripts/`.

---

## Bug 1 — `createWallet` silently accepts invalid chain names

**Severity:** Medium
**Affected method:** `CrossmintWallets.from(sdk).createWallet()`
**Test file:** `e2e-sdk-wallets-v1.mjs` · Suite 10

### Description

`createWallet` accepts any arbitrary string for the `chain` parameter without throwing a validation error. Unknown chain names (e.g. `"not-a-chain"`) are silently treated as EVM chains and result in a real wallet being created, with `wallet.chain` echoing back the invalid string.

### Reproduction

```js
const wallet = await sdk.createWallet({
    chain: "not-a-chain",       // should throw — does not
    recovery: { type: "external-wallet", address: "0x..." },
    owner: "userId:test",
});
// wallet is created, wallet.chain === "not-a-chain"
```

### Expected behavior

The SDK or API should reject unknown chain names with a `400`-level validation error before creating any resource.

---

## Bug 2 — `addSigner` with an invalid EVM address returns HTTP 500 ✅ FIXED

**Severity:** Medium
**Affected method:** `wallet.addSigner()`
**Test file:** `e2e-sdk-wallets-v1.mjs` · Suite 10
**Fixed in:** wallets-v1 branch (confirmed by test run after latest pull)

### Description

~~Passing a malformed EVM address string to `addSigner` caused the API to return an HTTP 500. Now returns a proper 400 validation error with `"Invalid address: not-a-valid-evm-address"`.~~

**Resolution:** API now returns a structured 400-level error:
```
Failed to register signer: "signer: [{ "code": "custom", "message": "Invalid address: not-a-valid-evm-address" }]"
```

---

## Bug 3 — Transaction status stuck at `"pending"` after device signer on-chain confirmation

**Severity:** High
**Affected flow:** Full device signer approval → `waitForTransaction` / polling
**Found via:** Manual testing (not caught by automated tests — see note below)

### Description

After a device signer signs and submits a transaction on-chain, the backend indexer never updates the transaction status from `"pending"` to `"success"`. The SDK's `approve()` method polls `waitForTransaction` (60-second timeout, exponential backoff 500 ms → 2000 ms) until `status !== "pending"`, so it will always time out with `TransactionConfirmationTimeoutError`.

### Evidence

- Transaction ID: `61a4a6a7-a8a0-47c1-b49f-64935d8499a4`
- On-chain tx hash: `0xc8021ce3...`
- After approval, the API response shows `approvals.pending: []` (all approvals collected) but `status` remains `"pending"` indefinitely.

### Why automated tests don't catch this

All fixture wallets use `external-wallet` recovery, which is read-only server-side — tests can only run `prepareOnly: true` calls and never reach the `"pending"` → `"success"` status transition. Reproducing this bug requires:

1. A wallet with a fully signing-capable signer (not external-wallet recovery).
2. Calling `approve()` (without `prepareOnly`).
3. Verifying that `waitForTransaction` eventually returns `status: "success"` — currently it times out.

### Expected behavior

Once `approvals.pending` is empty and the transaction has been broadcast on-chain, the indexer should update `status` to `"success"` within a reasonable time (< 60 s). `approve()` should then return successfully.

---

## Bug 4 — `createWallet` with a device signer in `signers[]` throws a `publicKey.x` format mismatch

**Severity:** High
**Affected method:** `CrossmintWallets.from(sdk).createWallet()` with `signers: [deviceDesc]`
**Test file:** `e2e-device-signer-wallets-v1.mjs` · Suite 5
**Affects:** EVM and Solana

### Description

When `createWallet` is called with a device signer descriptor in the `signers` array, the call fails with:

```
WalletCreationError: Wallet signer configuration mismatch at "publicKey.x" -
expected "<decimal>" from existing wallet but found "<0x-hex>"
```

**Root cause:** `createDeviceSigner()` returns `publicKey.x` as a `0x`-prefixed hex string (e.g. `"0xf4f4387d..."`). Internally, `createWallet` first registers the signer via the API (which stores `publicKey.x` as a plain decimal integer string, e.g. `"110795835..."`), then attempts a second `addSigner` call for idempotency validation. The decimal-vs-hex comparison fails, aborting the request.

Both representations are numerically identical — the bug is a format normalization inconsistency between what the API stores and what the SDK sends.

### Reproduction

```js
const desc = await sdk.createDeviceSigner(storage);
// desc.publicKey.x === "0xf4f4387d..." (hex)

await sdk.createWallet({
    chain: "base-sepolia",
    recovery: { type: "external-wallet", address: "0x..." },
    signers: [desc],   // <-- triggers the bug
    owner: "userId:test",
});
// throws: WalletCreationError: Wallet signer configuration mismatch at "publicKey.x"
```

### Workaround

Create the wallet first (without `signers`), then call `addSigner` separately:

```js
const wallet = await sdk.createWallet({
    chain: "base-sepolia",
    recovery: { type: "external-wallet", address: "0x..." },
});

const { signatureId } = await wallet.addSigner(desc, { prepareOnly: true });
// works correctly
```

### Expected behavior

`createWallet({ signers: [deviceDesc] })` should succeed. Either the API should store `publicKey.x` in the same format that `createDeviceSigner()` produces, or the SDK's idempotency check should normalize both values to the same format before comparing.

---

## Bug 5 — `wallet.transfers()` returns 400 — `tokens` param required but should be optional

**Severity:** High
**Affected method:** `wallet.transfers()`
**Found by:** External QA (wallets-react, email signer, SDK 0.20.2)
**Source:** `wallet.ts:368`

### Description

`wallet.transfers()` has the signature `transfers(params: { tokens: string; status: "successful" | "failed" })` with both params required. Calling it without arguments (the natural developer expectation) serialises `tokens` as the string `"undefined"`, which the API rejects with a `400 Bad Request`. The method is effectively unusable without passing valid params, and the error message does not explain what went wrong.

### Reproduction

```js
// Called without params — natural developer expectation
await wallet.transfers();
// throws: 400 "tokens=undefined" rejected by API
```

### Expected behavior

Both `tokens` and `status` should be optional query filters. Calling `wallet.transfers()` with no arguments should return all transfers for the wallet.

---

## Bug 6 — 0-value token transfers succeed on-chain (no SDK or API validation)

**Severity:** Medium
**Affected method:** `wallet.send()`
**Found by:** External QA (wallets-react, email signer, SDK 0.20.2)

### Description

Sending 0 USDC (or any token amount) with no balance succeeds end-to-end: the transaction is submitted, it lands on-chain, burns gas, and does nothing. Neither the SDK nor the API validates that the amount is greater than zero. This wastes user funds on gas for a no-op.

### Reproduction

```js
// Wallet has 0 USDC balance
await wallet.send(recipientAddress, "usdc", "0");
// Transaction goes through on-chain — no error
```

### Expected behavior

The SDK should reject `amount <= 0` before making any API call. The API should also validate this as a failsafe.

---

## Bug 7 — Duplicate TEE iframe initialised when `addSigner` is called for an already-registered signer ✅ FIXED

**Severity:** Low/Medium
**Affected method:** `wallet.addSigner()` (React / browser)
**Found by:** External QA (wallets-react, email signer, SDK 0.20.2)
**Fixed in:** commit `e60df988` — `fix: prevent duplicate TEE initialization race condition in NonCustodialSigner`

### Description

~~When `addSigner()` is called with a signer already registered on the wallet, the SDK still spun up the full TEE iframe + attestation flow (~1.6 s) before the API rejected the duplicate.~~

**Resolution:** Race condition in `NonCustodialSigner` initialization fixed. The TEE iframe is no longer initialized unnecessarily for duplicate signer registration attempts.

> Note: This is browser/React-only. Not covered by Node.js e2e scripts.

---

## Bug 8 — `experimental_apiClient` still present on wallet prototype (V1 requires removal)

**Severity:** Low
**Affected:** All wallet types (`EVMWallet`, `SolanaWallet`, `StellarWallet`)
**Found by:** Our scripts (Suite 21)

### Description

The V1 Source of Truth document specifies that all `experimental_` prefixed properties must be removed or renamed. However, `experimental_apiClient` is still present on the prototype chain of all wallet objects. Users relying on `wallet.experimental_apiClient` in V0 code will not get a clear deprecation error — the property silently continues to work.

### Reproduction

```js
const experimentalKeys = Object.getOwnPropertyNames(Object.getPrototypeOf(evmWallet))
    .filter(k => k.startsWith("experimental_"));
// experimentalKeys === ["experimental_apiClient"]  — should be []
```

### Expected behavior

`experimental_apiClient` should be removed (or throw a deprecation error) so that V1 clients get a clear signal to migrate. All `experimental_*` properties should be absent from the prototype.

---

## Bug 9 — `wallet.walletType` is not exposed on the SDK wallet object

**Severity:** Low
**Affected:** All wallet types (`EVMWallet`, `SolanaWallet`, `StellarWallet`)
**Found by:** Our scripts (Suite 23)

### Description

The underlying API response for `createWallet` and `getWallet` includes a `walletType` field (`"smart"` or `"mpc"`). However, the SDK wallet object does not surface this field — `wallet.walletType` is `undefined`. Developers have no way to know the wallet type from the SDK object alone.

### Reproduction

```js
const wallet = await sdk.createWallet({ chain: "base-sepolia", recovery: ... });
console.log(wallet.walletType); // undefined — should be "smart" or "mpc"
```

### Expected behavior

`wallet.walletType` should be accessible and return `"smart"` or `"mpc"` to match the API response.

---

## Bug 10 — `WalletFactory` returns base `Wallet` instead of chain-specific subclass

**Severity:** High
**Affected methods:** `signMessage`, `signTypedData` (only defined on `EVMWallet`)
**Found by:** Server signer e2e tests (Suite 6)

### Description

`WalletFactory.createWalletInstance` always returns `new Wallet(...)` (the base class) rather than `new EVMWallet(...)` for EVM chains. `EVMWallet` extends `Wallet` and adds `signMessage` and `signTypedData` — these methods are therefore never accessible on wallets created via `CrossmintWallets.from(sdk).createWallet()`. Both methods are `undefined` on all factory-created wallet instances.

### Reproduction

```js
const wallet = await sdk.createWallet({ chain: "base-sepolia", recovery: ... });
console.log(typeof wallet.signMessage);   // "undefined" — should be "function"
console.log(typeof wallet.signTypedData); // "undefined" — should be "function"
```

### Expected behavior

`createWallet` on an EVM chain should return an `EVMWallet` instance with `signMessage` and `signTypedData` accessible.

---

## Bug 11 — `useSigner("server:0x...")` string locator throws "Unknown signer type: server"

**Severity:** Medium
**Affected method:** `wallet.useSigner()` with string locator form
**Found by:** Server signer e2e tests (Suite 3)

### Description

The SDK does not support the string locator form (`"server:0x..."`) for server signers in `useSigner`. Calling `useSigner("server:0x...")` throws `"Unknown signer type: server"`. The object form `{ type: "server", secret }` must be used instead. This is by design (the secret is needed for HKDF-SHA256 key derivation and cannot be reconstructed from the address alone), but the error message is unclear.

### Reproduction

```js
await wallet.useSigner("server:0xc11ecd8F...");
// throws: "Unknown signer type: server"
```

### Expected behavior

Either: (a) throw a clear, actionable message: `"Server signers require the config form { type: 'server', secret } — address-only locator not supported"`, or (b) document this limitation clearly in the SDK docs/types.

---

## Summary table

| # | Method | Severity | Type | Found by | Status |
|---|--------|----------|------|----------|--------|
| 1 | `createWallet` — invalid chain string accepted | Medium | Missing input validation | Our scripts | Open |
| 2 | `addSigner` — invalid EVM address returns 500 | Medium | API returns 500 instead of 400 | Our scripts | **Fixed** |
| 3 | Transaction status stuck at `"pending"` after on-chain confirmation | High | Backend indexer not updating status | Manual testing | Open |
| 4 | `createWallet` with `signers: [deviceDesc]` throws `publicKey.x` format mismatch | High | Decimal/hex inconsistency in idempotency check | Our scripts | Open |
| 5 | `wallet.transfers()` returns 400 — `tokens` param required but should be optional | High | Wrong TypeScript signature / missing optional | External QA | Open |
| 6 | 0-value token transfers succeed on-chain | Medium | Missing amount validation on SDK and API | External QA | Open |
| 7 | Duplicate TEE iframe on `addSigner` for existing signer | Low/Medium | Missing pre-flight check before iframe init | External QA | **Fixed** |
| 8 | `experimental_apiClient` still on wallet prototype — not removed per V1 spec | Low | Missing cleanup / deprecation | Our scripts | Open |
| 9 | `wallet.walletType` is `undefined` — SDK does not expose the `walletType` field | Low | SDK omits field from wallet object | Our scripts | Open |
| 10 | `WalletFactory` returns base `Wallet` — `signMessage`/`signTypedData` inaccessible | High | Wrong class instantiated for EVM chains | Server signer scripts | Open |
| 11 | `useSigner("server:0x...")` string locator throws "Unknown signer type: server" | Medium | Missing error message / unsupported form | Server signer scripts | Open |
