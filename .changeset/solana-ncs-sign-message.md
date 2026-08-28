---
"@crossmint/wallets-sdk": minor
---

Solana email/phone signers can now sign arbitrary payloads: `SolanaNonCustodialSigner.signMessage(base58Payload)` returns a raw Ed25519 signature instead of rejecting.
