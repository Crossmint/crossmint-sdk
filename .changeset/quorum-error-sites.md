---
"@crossmint/wallets-sdk": minor
---

Wallet API calls now throw `QuorumRequestError` for the API's quorum error codes, and `TransactionExpiredError` (a `TransactionFailedError`) when an approval window has closed. An expired signature approval now throws `TransactionExpiredError` with `signatureId` instead of `SignatureFailedError`.
