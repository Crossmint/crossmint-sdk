---
"@crossmint/wallets-sdk": major
---

Split getOrCreateWallet into separate createWallet and getWallet methods. Added createDeviceSigner for client-to-server device signer flow. Biometric policy is now managed at the wallet config level. Client-side createWallet is idempotent. Wallets can be read-only when no signer is provided.
