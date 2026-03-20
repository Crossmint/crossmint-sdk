---
"@crossmint/wallets-sdk": minor
---

Breaking: `useSigner()` now only accepts signer config objects + recovery signer support

- **Breaking:** `useSigner()` no longer accepts locator strings — only signer config objects (`SignerConfigForChain<C>`)
- `useSigner()` now accepts the wallet's recovery (admin) signer in addition to delegated signers
- Recovery signers skip the delegated signer registration check
- External-wallet signers (both recovery and delegated) require the full config object with an `onSign` callback
- All signer types must be passed as config objects (e.g. `{ type: "email", email: "..." }`)
