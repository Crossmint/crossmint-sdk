---
"@crossmint/wallets-sdk": minor
---

Split getOrCreateWallet into separate getWallet and createWallet methods, both working client and server side. Make signer optional for read-only wallets. Add device signer resolution logic in getWallet. Add createDeviceSigner helper function. Support device signers with pre-existing locators.
