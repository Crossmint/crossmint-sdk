---
"@crossmint/wallets-sdk": patch
---

Throw `RecoveryMethodRequiredError` (a `SignerRequiredError` subclass) when a wallet has several recovery methods and none was selected with `useRecoveryMethod()` before `addSigner`, `removeSigner`, `addRecoveryMethod` or `removeRecoveryMethod`.
