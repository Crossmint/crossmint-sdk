---
"@crossmint/wallets-sdk": minor
---

An expired transaction or signature request now throws `TransactionExpiredError` (code `TRANSACTION_FAILED`), with `transactionId` or `signatureId`, wherever the SDK finds it: when `approve` reads the request, when a signature approval is submitted, and while the SDK waits for the request. Before, these threw an error with code `NO_TRANSACTION` or `NO_SIGNATURE`, or `SignatureFailedError` on submit. The error thrown while a transaction still awaits approval now carries `transactionId`.
