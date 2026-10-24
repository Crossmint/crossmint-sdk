---
"@crossmint/wallets-sdk": patch
---

Preserve the optional `inTransit` field in `wallet.balances()` results. For wallets with a card, it holds funds moving between the wallet and the card's collateral that the card provider has not reflected yet; `available + inTransit` is the total the user holds while funds move.
