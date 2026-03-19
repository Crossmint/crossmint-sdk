---
"@crossmint/wallets-sdk": patch
---

Support recovery signers in `useSigner()`

- `useSigner()` now accepts the wallet's recovery (admin) signer in addition to delegated signers
- Recovery signers skip the delegated signer registration check
- External-wallet recovery signers still require the full config object with an `onSign` callback
- For all other recovery signer types, a locator string is sufficient
