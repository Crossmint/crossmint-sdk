---
"@crossmint/wallets-sdk": patch
---

Fix wallet read + scope handling: nfts() now resolves the chain for the environment and throws on API errors (WAL-10671), transaction() serializes response.message instead of response.error (WAL-10672), and addSigner() fails loudly instead of silently dropping scopes when resuming a pending registration (WAL-10674).
