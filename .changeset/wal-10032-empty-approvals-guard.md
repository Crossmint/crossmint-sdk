---
"@crossmint/wallets-sdk": patch
---

Fix `wallet.approve()` posting an empty `approvals: []` payload when a transaction or signature has no pending approvals. The SDK now short-circuits and returns the existing transaction/signature instead of calling the API with an invalid empty array, which was being rejected with `approvals: Too small: expected array to have >=1 items`.
