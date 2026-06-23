---
"@crossmint/wallets-sdk": patch
---

refactor: extract transaction/signature polling from wallet.ts

- `services/operation-poller.ts`: `waitForTransactionCompletion` / `waitForSignatureCompletion` (moved from `Wallet.waitForTransaction` / `Wallet.waitForSignature`); `Wallet` keeps thin protected wrappers with identical signatures and defaults

Internal refactor — no behavior or public API changes.
