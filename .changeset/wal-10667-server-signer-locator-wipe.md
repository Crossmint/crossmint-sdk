---
"@crossmint/wallets-sdk": patch
---

fix(wallets): wipe server-signer key bytes on locator-only resolution (WAL-10667)

`ServerSignerResolver.apiLocator()` resolves a server signer to its on-chain locator (used by `addSigner` and by `send` with a server `options.signer`), which needs only the derived address. The selected candidate's `derivedKeyBytes` were left live in memory until GC — only the losing candidate was wiped. They are now `secureWipe`d unless the resolution is a cached slot, consistent with the existing secure-wipe hardening.
