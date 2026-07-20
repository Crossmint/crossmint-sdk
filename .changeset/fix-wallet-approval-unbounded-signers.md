---
"@crossmint/wallets-sdk": minor
---

Fix wallet approval failures when a device signer holds a valid local key but isn't in the wallet's currently-assembled signers list. `wallet.approve()` now falls back to local device-signer key storage instead of throwing `Signer not found in pending approvals`.
