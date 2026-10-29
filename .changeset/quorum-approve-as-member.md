---
"@crossmint/wallets-sdk": minor
---

Quorum members can approve. When a transaction or signature waits on a quorum, `approve` signs each pending member this client holds (the active signer, the key selected with `useRecoveryMethod`, and `additionalSigners`) over that member's own message, and `send` / `sendTransaction` with `signer: "quorum:<id>"` do the same after creating the transaction. `useSigner` accepts a key that is only a quorum member. When other members must still sign, the call throws `TransactionAwaitingApprovalError`, now with `quorums` (each quorum's progress), or the new `SignatureAwaitingApprovalError` (a `SignatureNotAvailableError`) for signatures. A transaction approval that the API answers with HTTP 422 (the approvals were already complete, or the transaction expired) now continues to the transaction's outcome, as signature approvals do.
