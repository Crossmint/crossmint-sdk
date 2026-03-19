---
"@crossmint/wallets-sdk": patch
---

Fix createWallet failing when a device signer descriptor from createDeviceSigner() is passed in signers[]. The publicKey.x/y hex values are now normalized to decimal before comparison during idempotency validation.

