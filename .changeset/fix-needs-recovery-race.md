---
"@crossmint/wallets-sdk": patch
---

Fix `needsRecovery()` returning stale `false` after `getWallet()` by awaiting signer initialization in the wallet factory. Also fix `recover()` non-device signer early-return not clearing `needsRecovery`.
