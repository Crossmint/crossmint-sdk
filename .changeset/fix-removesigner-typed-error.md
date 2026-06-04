---
"@crossmint/wallets-sdk": patch
---

fix: throw typed InvalidSignerError instead of generic Error when removeSigner API call fails

- `removeSigner` now throws `InvalidSignerError` (instead of generic `Error`) when the API returns an error response, consistent with `addSigner` error handling
- Passes the API error message as the error message and full response JSON as `details`
