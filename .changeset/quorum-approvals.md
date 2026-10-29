---
"@crossmint/wallets-sdk": minor
---

An expired transaction or signature request now throws `TransactionExpiredError`, with `transactionId` or `signatureId`, when `approve` reads the request and while the SDK waits for it. Before, these threw an error with code `NO_TRANSACTION` or `NO_SIGNATURE`. The error thrown while a transaction still awaits approval now carries `transactionId`.
