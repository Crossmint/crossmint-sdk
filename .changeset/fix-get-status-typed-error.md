---
"@crossmint/wallets-sdk": patch
---

fix: throw typed SignerStatusError instead of generic Error when get-status TEE call fails

- Add `SignerStatusError` class (exported) with optional `.code` from TEE response
- `handleAuthRequired` now throws `SignerStatusError` instead of `new Error(signerResponse?.error)`, preserving the TEE error code and guarding against undefined messages
