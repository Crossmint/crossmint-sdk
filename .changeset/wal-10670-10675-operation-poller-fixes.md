---
"@crossmint/wallets-sdk": patch
---

fix(wallets): transaction-failure message + signature polling timeout (WAL-10670, WAL-10675)

- `waitForTransactionCompletion`: the `failed` branch interpolated `transactionResponse.error`, which is always falsy there (any truthy error already threw earlier in the loop), so consumers always saw `Transaction sending failed: undefined`. It now serializes the full failed transaction response.
- `waitForSignatureCompletion`: previously polled a perpetually-pending signature forever. It now honors a `timeoutMs` (default 60s, matching `waitForTransactionCompletion`) and throws the new `SignatureConfirmationTimeoutError` on timeout.
