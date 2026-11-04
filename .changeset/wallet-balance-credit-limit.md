---
"@crossmint/wallets-sdk": patch
---

Type the `creditLimit` field on card accounts in `wallet.balances()` results. Each card in `accounts` now reports `creditLimit`: the collateral the card provider has credited to the card, which caps what it can spend.
