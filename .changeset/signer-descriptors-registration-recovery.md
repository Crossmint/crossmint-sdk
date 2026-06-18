---
"@crossmint/wallets-sdk": patch
---

refactor: move add-signer payload and recovery matching into SignerDescriptor

Adds `addSignerPayload` and `matchesRecovery` to each `SignerDescriptor`, removing the per-signer-type branches from `wallet.ts`'s `addSigner` payload construction and `isRecoverySigner`. The `#recovery` upgrade on a recovery match is now an explicit `adoptRecoveryConfig`. Internal refactor — no behavior or public API changes.
