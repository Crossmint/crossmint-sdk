---
"@crossmint/wallets-sdk": patch
---

Preserve the optional `available`, `locked`, and `accounts` fields in `wallet.balances()` results, including their API types. Card-backed token balances now expose spending power and pending charges alongside the total balance.
