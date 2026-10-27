---
"@crossmint/wallets-sdk": minor
---

Add quorum error classes: `QuorumRequestError` (the API's quorum error code in `reason`), `QuorumSelectionAmbiguousError` and `TransactionExpiredError`. Quorum approval progress now reads each member from the API's `member` field.
