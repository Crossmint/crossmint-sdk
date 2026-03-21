---
"@crossmint/wallets-sdk": patch
---

Improve error messages when server wallet signer is missing. Instead of a generic "read-only" error, the SDK now provides context-specific guidance for server signers, external-wallet signers, and wallets with multiple signers. Also adds a warning log when auto-assembly of the default signer fails.
