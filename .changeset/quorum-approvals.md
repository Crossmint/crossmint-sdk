---
"@crossmint/wallets-sdk": minor
---

An expired transaction or signature request now throws `TransactionExpiredError` (a `TransactionFailedError`) when `approve` reads it and while the SDK waits for it, with `transactionId` or `signatureId`. Before, it threw `TransactionNotAvailableError` or `SignatureNotAvailableError`. `TransactionAwaitingApprovalError` now carries `transactionId`; its constructor takes `{ transactionId }` as the second argument.
