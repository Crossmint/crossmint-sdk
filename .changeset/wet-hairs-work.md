---
"@crossmint/wallets-sdk": patch
---

Remove client-side guards that blanket-block device signers for all Solana wallets. Device signer support now depends on the wallet provider, with validation handled server-side. Added proper error handling to prevent repeated failure loops when the backend rejects a device signer.
