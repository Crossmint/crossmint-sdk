---
"@crossmint/wallets-sdk": minor
---

Add `wallet.addRecoveryMethod(recoveryMethod, { prepareOnly? })` and `wallet.removeRecoveryMethod(recoveryMethod, { prepareOnly? })` for Solana and Stellar wallets. Both operations are approved by one of the wallet's existing recovery methods, selected the same way as for `addSigner`/`removeSigner` (automatically when there is one, via `useSigner` when there are several). EVM wallets throw `RecoveryNotSupportedOnChainError` for now.
