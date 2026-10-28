---
"@crossmint/client-sdk-smart-wallet": patch
---

`signTypedData` no longer sends `isSmartWalletSignature: false`, which the signatures API now rejects. It returns the wallet's output signature, an ERC-6492 smart wallet signature, instead of the admin signer's raw signature.
