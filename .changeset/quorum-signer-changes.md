---
"@crossmint/wallets-sdk": minor
---

A recovery quorum can approve signer changes. `addSigner`, `removeSigner`, `addRecoveryMethod` and `removeRecoveryMethod` take a `signer` option, sent as the `approver`: a recovery quorum's locator, or one of the wallet's recovery methods. `useRecoveryMethod` accepts a key that is only a member of a recovery quorum; signer changes are then approved by that quorum, and `approve` signs that member's pending approvals. A wallet whose recovery methods are all quorums throws `RecoveryMethodRequiredError` until a member is selected or `signer` is passed.
