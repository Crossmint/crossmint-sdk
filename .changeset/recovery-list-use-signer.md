---
"@crossmint/wallets-sdk": patch
---

`wallet.useSigner` now matches against every recovery signer in the list, so any recovery signer of a Solana or Stellar wallet can be selected and approve transactions, not just the primary one.
