---
"@crossmint/wallets-sdk": minor
---

Homogenize signer management to always use full objects with approval status

- `addSigner()` now accepts full signer config objects (`SignerConfigForChain<C>`) instead of locator strings
- `addSigner()` returns a `DelegatedSigner` with approval status
- `signers()` returns full `DelegatedSigner` objects, filtered to only include signers that exist for the instantiated chain
- New `SignerStatus` and `DelegatedSigner` types are exported

