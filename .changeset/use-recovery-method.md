---
"@crossmint/wallets-sdk": minor
---

Add `wallet.useRecoveryMethod(recoveryMethod)` to choose which of a wallet's recovery methods authorizes `addSigner`, `removeSigner`, `addRecoveryMethod` and `removeRecoveryMethod`, without changing the active signer used for transactions. `useSigner` keeps working as before; an explicit `useRecoveryMethod` selection takes precedence over it.
