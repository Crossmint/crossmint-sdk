---
"@crossmint/wallets-sdk": patch
---

refactor(wallets): move SignerManager.require() per-type guidance into SignerDescriptor

`require()` no longer switches on the recovery signer type for its "no signer is set" guidance.
Each `SignerDescriptor` now provides `signerUnavailableReason(): string | null` — server and
external-wallet return their type-specific message, the rest return null and `require()` applies the
generic auto-assemblability fallback. Internal refactor — no behavior or public API changes.
