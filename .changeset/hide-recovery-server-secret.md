---
"@crossmint/wallets-sdk": patch
---

`wallet.recovery` and `wallet.recoveryMethods` no longer return the caller's raw server secret after `createWallet` (or after constructing a `Wallet` with a `{ type: "server", secret }` recovery config). The secret is retained internally for signing; the public getters now expose the same address-only `{ type: "server", address }` form that `getWallet` already returned.
