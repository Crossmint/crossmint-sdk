---
"@crossmint/wallets-sdk": minor
---

Stellar and Solana smart wallets accept passkey signers. On Stellar a passkey can be the admin signer, a recovery method or a delegated signer, and it signs the auth entry preimage hash as its WebAuthn challenge. On Solana a passkey can be a delegated signer, and it signs the transaction's P-256 message as its WebAuthn challenge.
