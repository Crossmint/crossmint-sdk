---
"@crossmint/wallets-sdk": patch
---

Add SDK-side approval signature validation in `wallet.approve()`. Validates signature format per signer type before submitting to the API: ECDSA hex format and byte length for EVM signers, P256 curve order bounds for device signers, and metadata presence for passkey signers. Rejects ERC-6492-wrapped signatures with a clear error message.
