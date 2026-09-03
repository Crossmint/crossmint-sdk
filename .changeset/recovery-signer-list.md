---
"@crossmint/wallets-sdk": minor
---

Solana and Stellar wallets can now be created with multiple recovery signers: `recovery` accepts a list, each entry resolved (passkey creation, server signer derivation) on its own, and `wallet.recoverySigners` exposes all of them. EVM still takes a single recovery signer.
