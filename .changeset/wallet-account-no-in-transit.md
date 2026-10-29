---
"@crossmint/wallets-sdk": patch
---

`wallet.balances()` no longer returns `inTransit` on the wallet account in `accounts`. Card accounts and the token total still have it.
