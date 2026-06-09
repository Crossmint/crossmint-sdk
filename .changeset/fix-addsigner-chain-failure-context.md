---
"@crossmint/wallets-sdk": patch
---

fix: throw typed InvalidSignerError with chain status details when addSigner chain registration fails

- `addSigner` now throws `InvalidSignerError` (instead of generic `Error`) when `response.chains[chain].status === "failed"`, consistent with the error handling 2 lines above for API-level failures
- Adds structured logging with chain status details
- Passes the chain status JSON as `details` so consumers can inspect the failure reason
