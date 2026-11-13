---
"@crossmint/wallets-sdk": patch
---

`wallet.send()` now throws typed subclasses of `TransactionNotCreatedError` for the card-collateral error codes returned by the wallets API — `CollateralFundsInTransitError` and `CollateralFundingTemporarilyUnavailableError` (`retryable: true`), `CollateralWithdrawalUnavailableError` and `CollateralWithdrawalIntegrityError` — and every `TransactionNotCreatedError` exposes the API's `code` as `apiErrorCode`. Existing `instanceof TransactionNotCreatedError` checks and `error.code` are unchanged.
