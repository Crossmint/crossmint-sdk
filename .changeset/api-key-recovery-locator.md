---
"@crossmint/wallets-sdk": patch
---

Fix `addRecoveryMethod` and `removeRecoveryMethod` on wallets whose recovery method is the api-key. The recovery-methods API now receives the api-key recovery method as `api-key:<address>` (from the wallet's recovery config returned by the API), both as `approver` and as the locator of the recovery method to remove, instead of the bare `"api-key"` it rejected. Transactions and signer operations keep sending `"api-key"`.
