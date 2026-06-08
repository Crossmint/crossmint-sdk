---
"@crossmint/wallets-sdk": patch
---

fix: throw typed KeyExportError instead of generic Error when export-signer TEE call fails

- Add `KeyExportError` class (exported) with optional `.code` from TEE response
- `_exportPrivateKey` now throws `KeyExportError` with structured logging instead of a generic `Error`
