---
"@crossmint/wallets-sdk": patch
---

Reject a `device` signer passed as a recovery method before calling the API, and apply the same recovery-list rules on `getWallet` that `createWallet` already enforces (non-empty list, one method on EVM). Recovery configuration is now validated before `onWalletCreationStart` and before any signer or passkey is created.
