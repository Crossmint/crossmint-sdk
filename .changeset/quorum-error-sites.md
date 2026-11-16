---
"@crossmint/wallets-sdk": minor
---

Wallet API calls now throw `QuorumRequestError` for the API's quorum error codes, and `TransactionExpiredError` when an approval window has closed. An expired signature approval now throws `TransactionExpiredError` with `signatureId`. Its `code` is `wallet:transaction-failed`; before, the SDK threw with `wallet:signing-failed`.
