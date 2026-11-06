---
"@crossmint/wallets-sdk": minor
---

An expired transaction or signature request now throws `TransactionExpiredError`, with `transactionId` or `signatureId`, when `approve` reads the request and while the SDK waits for it. Its `code` is `wallet:transaction-failed` for both; before, these threw with `wallet:no-transaction` or `wallet:no-signature`. This applies to every wallet, not only quorum wallets: the API also expires an EVM transaction that waits for approval longer than its paymaster allows. The error thrown while a transaction still awaits approval now carries `transactionId`.
