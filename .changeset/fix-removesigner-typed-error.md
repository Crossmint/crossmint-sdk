---
"@crossmint/wallets-sdk": patch
---

fix(wallets): throw typed InvalidSignerError when removeSigner API call fails

Replace generic `Error` with `InvalidSignerError` in `removeSigner` error path,
preserving the API response details for consumers to inspect.
