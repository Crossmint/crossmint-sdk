---
"@crossmint/wallets-sdk": minor
---

An expired transaction or signature request now throws `TransactionExpiredError`, with `transactionId` or `signatureId`, when `approve` reads the request and while the SDK waits for it. Its `code` is `wallet:transaction-failed` for both; before, these threw with `wallet:no-transaction` or `wallet:no-signature`. The error thrown while a transaction still awaits approval now carries `transactionId`.
