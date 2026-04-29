---
"@crossmint/wallets-sdk": patch
---

Add `StellarWallet.upgrade()` and `StellarWallet.migrate()` for moving a Stellar smart wallet to a newer contract version. `upgrade()` orchestrates the two on-chain phases (bytecode swap, then storage migration) behind a single call and is idempotent against the 409 the API returns once phase 1 has landed — retrying after a crash skips straight to migration. Both methods support `prepareOnly` for non-custodial flows where the developer drives approvals manually.
