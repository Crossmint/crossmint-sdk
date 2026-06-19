---
"@crossmint/wallets-sdk": patch
---

refactor: extract SignerManager from wallet.ts

Moves the device-independent signer-session core — the active signer, the recovery config, and the operations on them (`require`, `withRecoverySigner`, signer assembly, recovery-config adoption/secret-stripping, signer-state queries) — out of `wallet.ts` into a dedicated `SignerManager` (`services/signer-manager.ts`). `wallet.ts` delegates to it through a one-way seam; device recovery and `useSigner` orchestration remain in `Wallet`. Internal refactor — no behavior or public API changes.
