---
"@crossmint/wallets-sdk": patch
---

`getWallet` resolves faster when the device signer's key is on this device: signer initialization reads the signer's status from the wallet response instead of fetching the wallet and each signer again, and the device key storage (an iframe on web) starts loading alongside the wallet request. `DeviceSignerKeyStorage` gains an optional `preload()` hook (no-op by default).
