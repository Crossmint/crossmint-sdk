---
"@crossmint/wallets-sdk": minor
---

Quorum members can approve on EVM and Stellar wallets. When a transaction or signature waits on a quorum, `approve` signs each pending member this client holds (the active signer, the key selected with `useRecoveryMethod`, and `additionalSigners`) over that member's own message. On Stellar, a member signs once for each auth entry the quorum must approve, and all approvals go in one request. `useSigner` accepts a key that is only a quorum member.

While other quorum members must still sign, `approve` returns the transaction with `hash` and `explorerLink` undefined, or the signature with `signature` undefined; check `hash == null` (or `signature == null`). Before, it threw `TransactionAwaitingApprovalError` for transactions and `SignatureNotAvailableError` for signatures. A wait for a signer that is not a quorum member still throws `TransactionAwaitingApprovalError`. Stellar `migrate()` returns the same shape, and `upgrade()` returns the phase-1 transaction without a hash and skips the migration; call `migrate()` once phase 1 lands. `addSigner` that resumes a registration quorum members must still approve returns the signer with its `transactionId` or `signatureId` and its current status, as with `prepareOnly: true`.

A transaction approval that the API answers with HTTP 422 because its approvals are already complete (another member signed first) now continues to the transaction's outcome instead of throwing. A signature approval the API rejects with another 422 now throws `SignatureFailedError` instead of being re-read as complete.
