---
"@crossmint/wallets-sdk": minor
---

Solana `serializedTransaction` values now accept base58 or base64 encoding with automatic detection. Solana web3.js transaction types are re-exported, and the `@solana/web3.js` dependency range is relaxed to reduce duplicate-copy type clashes.
